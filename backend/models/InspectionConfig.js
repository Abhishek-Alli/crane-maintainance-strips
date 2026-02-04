const { query, transaction, pool } = require('../config/database');
// ✅ FIX: corrected import, pool now defined

/**
 * InspectionConfig Model - V2 Compatible
 * Uses form_sections and form_items tables from V2 schema
 */
const db = require('../config/database');

class InspectionConfigModel {

  /**
   * Get all sheds (NO FILTER)
   * ⚠️ kept for backward compatibility
   */
  static async getShedsAll() {
    const result = await query(
      'SELECT * FROM sheds WHERE is_active = true ORDER BY name'
    );
    return result.rows;
  }

  /**
   * Get sheds with optional department filter
   * ✅ NEW SAFE VERSION
   */
  static async getSheds(filters = {}) {
    let sql = `
      SELECT id, name, code
      FROM sheds
      WHERE is_active = true
    `;
    const values = [];

    if (filters.department_id) {
      values.push(filters.department_id);
      sql += ` AND department_id = $${values.length}`;
    }

    sql += ' ORDER BY name';

    const { rows } = await pool.query(sql, values);
    return rows;
  }

  static async getShedsByDepartment(departmentId) {
    const { rows } = await pool.query(
      `
      SELECT id, name, code
      FROM sheds
      WHERE department_id = $1
        AND is_active = true
      ORDER BY name
      `,
      [departmentId]
    );
    return rows;
  }

  /**
   * ✅ FIXED: Get sections WITH items (single optimized query)
   */
  static async getSectionsWithItems(formId) {
  const { rows } = await pool.query(`
    SELECT
      fs.id,
      fs.name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', fi.id,
            'field_name', fi.field_name,
            'field_type', fi.field_type,
            'display_order', fi.display_order,
            'is_required', fi.is_required,
            'dropdown_options', fi.dropdown_options,
            'default_value', fi.default_value,
            'help_text', fi.help_text,
            'alert_value', fi.alert_value,
            'alert_message', fi.alert_message,
            'conditional_logic', fi.conditional_logic
          )
          ORDER BY fi.display_order
        ) FILTER (WHERE fi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM form_sections fs
    LEFT JOIN form_items fi ON fi.section_id = fs.id
    WHERE fs.form_id = $1
    GROUP BY fs.id
    ORDER BY fs.display_order;
  `, [formId]);

  return rows;
}


  static async getSectionById(id) {
    const result = await query(
      'SELECT * FROM form_sections WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async getItemById(id) {
    const result = await query(
      `
      SELECT fi.*, fs.name AS section_name
      FROM form_items fi
      JOIN form_sections fs ON fi.section_id = fs.id
      WHERE fi.id = $1
      `,
      [id]
    );
    return result.rows[0] || null;
  }

  static async createSection(data) {
    const { form_id, name, display_order, is_required, description } = data;

    const result = await query(
      `
      INSERT INTO form_sections
        (form_id, name, display_order, is_required, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [form_id || 1, name, display_order, is_required || false, description]
    );

    return result.rows[0];
  }

  static async updateSection(id, data) {
    const { name, display_order, is_required, description } = data;

    const result = await query(
      `
      UPDATE form_sections
      SET name = $1,
          display_order = $2,
          is_required = $3,
          description = $4
      WHERE id = $5
      RETURNING *
      `,
      [name, display_order, is_required, description, id]
    );

    return result.rows[0];
  }

  static async createItem(data) {
    const {
      section_id,
      field_name,
      field_type,
      display_order,
      dropdown_options,
      is_required,
      alert_condition,
      alert_value,
      help_text
    } = data;

    const result = await query(
      `
      INSERT INTO form_items
        (section_id, field_name, field_type, display_order,
         dropdown_options, is_required,
         alert_condition, alert_value, help_text)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        section_id,
        field_name,
        field_type || 'DROPDOWN',
        display_order,
        dropdown_options,
        is_required || false,
        alert_condition || 'NONE',
        alert_value,
        help_text
      ]
    );

    return result.rows[0];
  }

  // =======================
  // DEPARTMENTS
  // =======================

  static async getDepartments() {
    const { rows } = await pool.query(
      `
      SELECT id, name, code
      FROM departments
      ORDER BY name
      `
    );
    return rows;
  }

  static async deleteSection(id) {
    const result = await query(
      'DELETE FROM form_sections WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async deleteItem(id) {
    const result = await query(
      'DELETE FROM form_items WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async createShed(data) {
    const { name, code } = data;
    const result = await query(
      'INSERT INTO sheds (name, code) VALUES ($1, $2) RETURNING *',
      [name, code]
    );
    return result.rows[0];
  }

  /**
   * ✅ FIXED: method name
   */
  static async updateShed(id, data) {
    const { name, code } = data;
    const result = await query(
      'UPDATE sheds SET name = $1, code = $2 WHERE id = $3 RETURNING *',
      [name, code, id]
    );
    return result.rows[0];
  }

  static async getForms() {
    const result = await query(
      'SELECT * FROM v_forms WHERE is_active = true ORDER BY name'
    );
    return result.rows;
  }
}

module.exports = InspectionConfigModel;
