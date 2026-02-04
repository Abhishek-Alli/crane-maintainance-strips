/**
 * MaintenanceTracking Model
 *
 * Handles CRUD operations for monthly_maintenance_tracking table.
 * Tracks crane maintenance status per month based on calendar schedule.
 */

const { query } = require('../config/database');
const {
  resolveDepartmentByDate,
  getDepartmentDateRange,
  isReschedulePeriod,
  formatDateISO
} = require('../utils/maintenanceSchedule');

class MaintenanceTracking {
  static tableCreated = false;

  /**
   * Ensure the monthly_maintenance_tracking table exists
   * Creates the table if it doesn't exist
   */
  static async ensureTableExists() {
    if (this.tableCreated) return;

    try {
      // Create table if not exists
      await query(`
        CREATE TABLE IF NOT EXISTS monthly_maintenance_tracking (
          id SERIAL PRIMARY KEY,
          crane_id INTEGER NOT NULL REFERENCES cranes(id) ON DELETE CASCADE,
          department_code VARCHAR(10) NOT NULL,
          year INTEGER NOT NULL,
          month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
            CHECK (status IN ('PENDING', 'COMPLETED', 'MISSED', 'RESCHEDULED')),
          scheduled_start DATE NOT NULL,
          scheduled_end DATE NOT NULL,
          completed_date DATE,
          completed_in_reschedule BOOLEAN DEFAULT FALSE,
          submission_log_id INTEGER,
          manually_marked BOOLEAN DEFAULT FALSE,
          marked_by INTEGER,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_crane_month UNIQUE (crane_id, year, month)
        )
      `);

      // Create indexes - wrap each in try-catch to handle race conditions
      try {
        await query(`
          CREATE INDEX IF NOT EXISTS idx_mmt_department_month
            ON monthly_maintenance_tracking(department_code, year, month)
        `);
      } catch (e) {
        // Index might already exist, ignore
      }

      try {
        await query(`
          CREATE INDEX IF NOT EXISTS idx_mmt_status
            ON monthly_maintenance_tracking(status)
        `);
      } catch (e) {
        // Index might already exist, ignore
      }

      try {
        await query(`
          CREATE INDEX IF NOT EXISTS idx_mmt_crane_period
            ON monthly_maintenance_tracking(crane_id, year, month)
        `);
      } catch (e) {
        // Index might already exist, ignore
      }

      this.tableCreated = true;
      console.log('monthly_maintenance_tracking table ensured');
    } catch (error) {
      // If error is "already exists", just mark as created and continue
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        this.tableCreated = true;
        console.log('monthly_maintenance_tracking table already exists');
        return;
      }
      console.error('Error ensuring table exists:', error);
      throw error;
    }
  }

  /**
   * Initialize tracking records for all cranes for a given month
   * Creates PENDING records for cranes that don't have records yet
   * @param {number} year
   * @param {number} month - 1-indexed (1 = January)
   */
  static async initializeMonthTracking(year, month) {
    await this.ensureTableExists();
    const monthIndex = month - 1; // Convert to 0-indexed for getDepartmentDateRange

    // Get all active cranes with their department codes (using name as code)
    const cranesResult = await query(`
      SELECT
        c.id as crane_id,
        d.name as department_code
      FROM cranes c
      JOIN sheds s ON c.shed_id = s.id
      JOIN departments d ON s.department_id = d.id
      WHERE c.is_active = true
    `);

    const cranes = cranesResult.rows;
    let createdCount = 0;

    for (const crane of cranes) {
      // Skip if not a valid maintenance department
      if (!['HSM', 'HBM', 'PTM'].includes(crane.department_code)) {
        continue;
      }

      const range = getDepartmentDateRange(crane.department_code, year, monthIndex);

      // Use INSERT ... ON CONFLICT to handle race conditions
      try {
        const result = await query(
          `INSERT INTO monthly_maintenance_tracking
           (crane_id, department_code, year, month, status, scheduled_start, scheduled_end)
           VALUES ($1, $2, $3, $4, 'PENDING', $5, $6)
           ON CONFLICT (crane_id, year, month) DO NOTHING
           RETURNING id`,
          [
            crane.crane_id,
            crane.department_code,
            year,
            month,
            formatDateISO(range.startDate),
            formatDateISO(range.endDate)
          ]
        );
        if (result.rows.length > 0) {
          createdCount++;
        }
      } catch (insertError) {
        // Ignore duplicate key errors from race conditions
        if (insertError.code !== '23505') {
          console.error('Error inserting tracking record:', insertError);
        }
      }
    }

    return { createdCount, totalCranes: cranes.length };
  }

  /**
   * Get maintenance status for all cranes in a department for a given month
   * @param {string} departmentCode - 'HSM'|'HBM'|'PTM'
   * @param {number} year
   * @param {number} month - 1-indexed
   */
  static async getStatusByDepartment(departmentCode, year, month) {
    await this.ensureTableExists();
    const result = await query(
      `SELECT
        mmt.id,
        mmt.crane_id,
        mmt.department_code,
        mmt.year,
        mmt.month,
        mmt.status,
        mmt.scheduled_start,
        mmt.scheduled_end,
        mmt.completed_date,
        mmt.completed_in_reschedule,
        mmt.manually_marked,
        mmt.notes,
        c.crane_number,
        s.name as shed_name,
        s.code as shed_code,
        u.username as marked_by_username
      FROM monthly_maintenance_tracking mmt
      JOIN cranes c ON mmt.crane_id = c.id
      JOIN sheds s ON c.shed_id = s.id
      LEFT JOIN users u ON mmt.marked_by = u.id
      WHERE mmt.department_code = $1
        AND mmt.year = $2
        AND mmt.month = $3
        AND c.is_active = true
      ORDER BY s.name, c.crane_number`,
      [departmentCode, year, month]
    );

    return result.rows;
  }

  /**
   * Get summary statistics for a department in a month
   * @param {string} departmentCode
   * @param {number} year
   * @param {number} month - 1-indexed
   */
  static async getDepartmentSummary(departmentCode, year, month) {
    await this.ensureTableExists();
    const result = await query(
      `SELECT
        COUNT(*) as total_cranes,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'MISSED') as missed,
        COUNT(*) FILTER (WHERE status = 'RESCHEDULED') as rescheduled
      FROM monthly_maintenance_tracking
      WHERE department_code = $1
        AND year = $2
        AND month = $3`,
      [departmentCode, year, month]
    );

    return result.rows[0] || {
      total_cranes: 0,
      completed: 0,
      pending: 0,
      missed: 0,
      rescheduled: 0
    };
  }

  /**
   * Get all department summaries for a month
   * @param {number} year
   * @param {number} month - 1-indexed
   */
  static async getAllDepartmentSummaries(year, month) {
    await this.ensureTableExists();
    const result = await query(
      `SELECT
        department_code,
        COUNT(*) as total_cranes,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'MISSED') as missed,
        COUNT(*) FILTER (WHERE status = 'RESCHEDULED') as rescheduled
      FROM monthly_maintenance_tracking
      WHERE year = $1 AND month = $2
      GROUP BY department_code
      ORDER BY
        CASE department_code
          WHEN 'HSM' THEN 1
          WHEN 'HBM' THEN 2
          WHEN 'PTM' THEN 3
        END`,
      [year, month]
    );

    return result.rows;
  }

  /**
   * Get all missed cranes for reschedule period
   * @param {number} year
   * @param {number} month - 1-indexed
   */
  static async getMissedCranes(year, month) {
    await this.ensureTableExists();
    const result = await query(
      `SELECT
        mmt.id,
        mmt.crane_id,
        mmt.department_code,
        mmt.status,
        mmt.scheduled_start,
        mmt.scheduled_end,
        c.crane_number,
        s.name as shed_name,
        d.name as department_name
      FROM monthly_maintenance_tracking mmt
      JOIN cranes c ON mmt.crane_id = c.id
      JOIN sheds s ON c.shed_id = s.id
      JOIN departments d ON s.department_id = d.id
      WHERE mmt.year = $1
        AND mmt.month = $2
        AND mmt.status IN ('MISSED', 'PENDING')
        AND c.is_active = true
      ORDER BY
        CASE mmt.department_code
          WHEN 'HSM' THEN 1
          WHEN 'HBM' THEN 2
          WHEN 'PTM' THEN 3
        END,
        s.name,
        c.crane_number`,
      [year, month]
    );

    return result.rows;
  }

  /**
   * Mark a crane's maintenance as completed
   * @param {number} craneId
   * @param {number} year
   * @param {number} month - 1-indexed
   * @param {number} submissionLogId - Reference to the inspection submission
   * @param {Date} completedDate
   */
  static async markCompleted(craneId, year, month, submissionLogId, completedDate = new Date()) {
    await this.ensureTableExists();
    const isReschedule = isReschedulePeriod(completedDate);

    const result = await query(
      `UPDATE monthly_maintenance_tracking
       SET
         status = $1,
         completed_date = $2,
         completed_in_reschedule = $3,
         submission_log_id = $4,
         updated_at = CURRENT_TIMESTAMP
       WHERE crane_id = $5 AND year = $6 AND month = $7
       RETURNING *`,
      [
        isReschedule ? 'RESCHEDULED' : 'COMPLETED',
        formatDateISO(completedDate),
        isReschedule,
        submissionLogId,
        craneId,
        year,
        month
      ]
    );

    return result.rows[0];
  }

  /**
   * Manually mark a crane's maintenance status (Admin override)
   * @param {number} craneId
   * @param {number} year
   * @param {number} month - 1-indexed
   * @param {string} status - 'COMPLETED'|'MISSED'|'PENDING'|'RESCHEDULED'
   * @param {number} userId - User making the change
   * @param {string} notes - Optional notes
   */
  static async manuallyMarkStatus(craneId, year, month, status, userId, notes = null) {
    await this.ensureTableExists();
    const result = await query(
      `UPDATE monthly_maintenance_tracking
       SET
         status = $1,
         manually_marked = true,
         marked_by = $2,
         notes = COALESCE($3, notes),
         completed_date = CASE WHEN $1 IN ('COMPLETED', 'RESCHEDULED') THEN CURRENT_DATE ELSE completed_date END,
         updated_at = CURRENT_TIMESTAMP
       WHERE crane_id = $4 AND year = $5 AND month = $6
       RETURNING *`,
      [status, userId, notes, craneId, year, month]
    );

    return result.rows[0];
  }

  /**
   * Update expired statuses - mark PENDING as MISSED after window passes
   * Should be called daily or on-demand
   * @param {Date} currentDate - The date to check against (defaults to now)
   */
  static async updateExpiredStatuses(currentDate = new Date()) {
    await this.ensureTableExists();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();

    // Mark HSM as MISSED if we're past day 5 (and not in reschedule yet)
    if (day > 5 && day < 24) {
      await query(
        `UPDATE monthly_maintenance_tracking
         SET status = 'MISSED', updated_at = CURRENT_TIMESTAMP
         WHERE department_code = 'HSM'
           AND year = $1
           AND month = $2
           AND status = 'PENDING'`,
        [year, month]
      );
    }

    // Mark HBM as MISSED if we're past day 12 (and not in reschedule yet)
    if (day > 12 && day < 24) {
      await query(
        `UPDATE monthly_maintenance_tracking
         SET status = 'MISSED', updated_at = CURRENT_TIMESTAMP
         WHERE department_code = 'HBM'
           AND year = $1
           AND month = $2
           AND status = 'PENDING'`,
        [year, month]
      );
    }

    // Mark PTM as MISSED if we're past day 23 (and not in reschedule yet)
    if (day > 23 && day < 24) {
      // This condition is actually impossible (day > 23 and day < 24)
      // PTM gets marked MISSED at the start of reschedule period
    }

    // At day 24 (start of reschedule), mark all remaining PENDING as MISSED
    if (day >= 24) {
      await query(
        `UPDATE monthly_maintenance_tracking
         SET status = 'MISSED', updated_at = CURRENT_TIMESTAMP
         WHERE year = $1
           AND month = $2
           AND status = 'PENDING'`,
        [year, month]
      );
    }

    return { processed: true, date: formatDateISO(currentDate) };
  }

  /**
   * Get tracking record for a specific crane and month
   * @param {number} craneId
   * @param {number} year
   * @param {number} month - 1-indexed
   */
  static async getByCraneAndMonth(craneId, year, month) {
    await this.ensureTableExists();
    const result = await query(
      `SELECT
        mmt.*,
        c.crane_number,
        s.name as shed_name
      FROM monthly_maintenance_tracking mmt
      JOIN cranes c ON mmt.crane_id = c.id
      JOIN sheds s ON c.shed_id = s.id
      WHERE mmt.crane_id = $1 AND mmt.year = $2 AND mmt.month = $3`,
      [craneId, year, month]
    );

    return result.rows[0] || null;
  }

  /**
   * Ensure tracking record exists for a crane, creating if necessary
   * @param {number} craneId
   * @param {number} year
   * @param {number} month - 1-indexed
   */
  static async ensureTrackingExists(craneId, year, month) {
    // First, try to get existing record
    let record = await this.getByCraneAndMonth(craneId, year, month);

    if (record) {
      return record;
    }

    // Get crane's department code (using name as code)
    const craneResult = await query(
      `SELECT d.name as department_code
       FROM cranes c
       JOIN sheds s ON c.shed_id = s.id
       JOIN departments d ON s.department_id = d.id
       WHERE c.id = $1`,
      [craneId]
    );

    if (craneResult.rows.length === 0) {
      throw new Error(`Crane with ID ${craneId} not found`);
    }

    const departmentCode = craneResult.rows[0].department_code;
    const monthIndex = month - 1;
    const range = getDepartmentDateRange(departmentCode, year, monthIndex);

    // Create the record
    const insertResult = await query(
      `INSERT INTO monthly_maintenance_tracking
       (crane_id, department_code, year, month, status, scheduled_start, scheduled_end)
       VALUES ($1, $2, $3, $4, 'PENDING', $5, $6)
       ON CONFLICT (crane_id, year, month) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        craneId,
        departmentCode,
        year,
        month,
        formatDateISO(range.startDate),
        formatDateISO(range.endDate)
      ]
    );

    return insertResult.rows[0];
  }

  /**
   * Get crane's department code (using name as code)
   * @param {number} craneId
   */
  static async getCraneDepartmentCode(craneId) {
    const result = await query(
      `SELECT d.name as department_code
       FROM cranes c
       JOIN sheds s ON c.shed_id = s.id
       JOIN departments d ON s.department_id = d.id
       WHERE c.id = $1`,
      [craneId]
    );

    return result.rows[0]?.department_code || null;
  }
}

module.exports = MaintenanceTracking;
