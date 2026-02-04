const { query } = require('../config/database');

class CraneModel {
  /**
   * Get all cranes with shed information
   * V2 Schema Compatible
   */
  static async getAll(filters = {}) {
    let whereClause = 'WHERE c.is_active = true';
    const params = [];
    let paramCount = 1;

    if (filters.shed_id) {
      whereClause += ` AND c.shed_id = $${paramCount}`;
      params.push(filters.shed_id);
      paramCount++;
    }

    const result = await query(
      `SELECT
        c.id,
        c.crane_number,
        c.maintenance_frequency,
        c.is_active,
        c.created_at,
        c.updated_at,
        s.id as shed_id,
        s.name as shed_name,
        s.code as shed_code
      FROM cranes c
      JOIN sheds s ON c.shed_id = s.id
      ${whereClause}
      ORDER BY s.name, c.crane_number`,
      params
    );

    return result.rows;
  }

  /**
   * Get crane by ID
   */
  static async getById(id) {
    const result = await query(
      `SELECT
        c.id,
        c.crane_number,
        c.maintenance_frequency,
        c.is_active,
        c.created_at,
        c.updated_at,
        s.id as shed_id,
        s.name as shed_name,
        s.code as shed_code
      FROM cranes c
      JOIN sheds s ON c.shed_id = s.id
      WHERE c.id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Get cranes by shed
   */
  static async getByShed(shed_id) {
    const result = await query(
      `SELECT
        c.id,
        c.crane_number,
        c.maintenance_frequency,
        c.is_active,
        s.name as shed_name
      FROM cranes c
      JOIN sheds s ON c.shed_id = s.id
      WHERE c.shed_id = $1 AND c.is_active = true
      ORDER BY c.crane_number`,
      [shed_id]
    );

    return result.rows;
  }

  /**
   * Update crane maintenance status based on submission log
   * V2: Inspection data is in Google Sheets, we track submissions in submission_log
   */
  static async updateMaintenanceStatus() {

  // Mark inspections having any NOT OK as alerts
  await query(`
    UPDATE inspections i
    SET has_alerts = true
    WHERE EXISTS (
      SELECT 1
      FROM inspection_values iv
      WHERE iv.inspection_id = i.id
        AND iv.selected_value = 'NOT OK'
    )
  `);

  // Clear alerts where no NOT OK exists
  await query(`
    UPDATE inspections i
    SET has_alerts = false
    WHERE NOT EXISTS (
      SELECT 1
      FROM inspection_values iv
      WHERE iv.inspection_id = i.id
        AND iv.selected_value = 'NOT OK'
    )
  `);

  
    return true;
  }

  /**
   * Get maintenance notifications
   * V2: Uses submission_log to determine which cranes need maintenance
   */
  static async getMaintenanceNotifications() {
    const result = await query(
      `SELECT
        c.id as crane_id,
        s.name as shed_name,
        c.crane_number,
        c.maintenance_frequency,
        sl.inspection_date as last_inspection_date,
        sl.crane_status as last_status,
        CASE
          WHEN c.maintenance_frequency = 'DAILY' THEN sl.inspection_date + INTERVAL '1 day'
          WHEN c.maintenance_frequency = 'WEEKLY' THEN sl.inspection_date + INTERVAL '7 days'
          WHEN c.maintenance_frequency = 'MONTHLY' THEN sl.inspection_date + INTERVAL '1 month'
        END as next_maintenance_date,
        CASE
          WHEN c.maintenance_frequency = 'DAILY' AND CURRENT_DATE > sl.inspection_date + INTERVAL '1 day' THEN 'PENDING'
          WHEN c.maintenance_frequency = 'WEEKLY' AND CURRENT_DATE > sl.inspection_date + INTERVAL '7 days' THEN 'PENDING'
          WHEN c.maintenance_frequency = 'MONTHLY' AND CURRENT_DATE > sl.inspection_date + INTERVAL '1 month' THEN 'PENDING'
          WHEN c.maintenance_frequency = 'DAILY' AND CURRENT_DATE = sl.inspection_date + INTERVAL '1 day' THEN 'DUE'
          WHEN c.maintenance_frequency = 'WEEKLY' AND CURRENT_DATE = sl.inspection_date + INTERVAL '7 days' THEN 'DUE'
          WHEN c.maintenance_frequency = 'MONTHLY' AND CURRENT_DATE = sl.inspection_date + INTERVAL '1 month' THEN 'DUE'
          ELSE 'OK'
        END as notification_status
      FROM cranes c
      JOIN sheds s ON c.shed_id = s.id
      LEFT JOIN (
        SELECT DISTINCT ON (crane_id) crane_id, inspection_date, crane_status
        FROM submission_log
        ORDER BY crane_id, inspection_date DESC
      ) sl ON c.id = sl.crane_id
      WHERE c.is_active = true
      ORDER BY c.crane_number`
    );

    // Filter to only return DUE or PENDING
    return result.rows.filter(r => r.notification_status === 'DUE' || r.notification_status === 'PENDING');
  }

  /**
   * Get dashboard statistics
   * V2: Uses submission_log for stats
   */
  static async getDashboardStats() {

  const totalCranes = await query(`
    SELECT COUNT(*) FROM cranes WHERE is_active = true
  `);

  const inspectedThisMonth = await query(`
    SELECT COUNT(DISTINCT crane_id)
    FROM inspections
    WHERE DATE_TRUNC('month', inspection_date) =
          DATE_TRUNC('month', CURRENT_DATE)
  `);

  const withIssues = await query(`
    SELECT COUNT(DISTINCT crane_id)
    FROM inspections
    WHERE has_alerts = true
      AND DATE_TRUNC('month', inspection_date) =
          DATE_TRUNC('month', CURRENT_DATE)
  `);

  const remainingThisMonth = await query(`
    SELECT COUNT(*) FROM cranes c
    WHERE c.is_active = true
      AND c.id NOT IN (
        SELECT DISTINCT crane_id
        FROM inspections
        WHERE DATE_TRUNC('month', inspection_date) =
              DATE_TRUNC('month', CURRENT_DATE)
      )
  `);

  return {
    total_cranes: Number(totalCranes.rows[0].count),
    inspected_this_month: Number(inspectedThisMonth.rows[0].count),
    remaining_this_month: Number(remainingThisMonth.rows[0].count),
    with_issues: Number(withIssues.rows[0].count),
    overdue: 0
  };
}

  /**
   * Create new crane
   */
  static async create(data) {
    const { shed_id, crane_number, maintenance_frequency } = data;

    const result = await query(
      `INSERT INTO cranes (shed_id, crane_number, maintenance_frequency)
      VALUES ($1, $2, $3)
      RETURNING *`,
      [shed_id, crane_number, maintenance_frequency]
    );

    return result.rows[0];
  }

  /**
   * Update crane
   */
  static async update(id, data) {
    const { shed_id, crane_number, maintenance_frequency } = data;

    const result = await query(
      `UPDATE cranes
      SET shed_id = $1, crane_number = $2, maintenance_frequency = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`,
      [shed_id, crane_number, maintenance_frequency, id]
    );

    return result.rows[0];
  }

  /**
   * Delete crane (soft delete)
   */
  static async delete(id) {
    const result = await query(
      'UPDATE cranes SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );

    return result.rows[0];
  }
}

module.exports = CraneModel;
