const { query, transaction } = require('../config/database');

class FormController {
  /**
   * Get all forms
   * GET /api/forms
   */
  static async getAll(req, res) {
    try {
      const result = await query(
  `SELECT
     id,
     name,
     description,
     is_active,
     created_at
   FROM forms
   WHERE is_active = true
   ORDER BY name`
);


      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Get forms error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch forms',
        error: error.message
      });
    }
  }

  /**
   * Get form by ID with sections and items
   * GET /api/forms/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      // Get form details
      const formResult = await query(
        `SELECT
          f.id,
          f.name,
          f.description,
          f.version,
          f.is_active,
          u.full_name as created_by_name,
          f.created_at,
          f.updated_at
        FROM forms f
        LEFT JOIN users u ON f.created_by = u.id
        WHERE f.id = $1`,
        [id]
      );

      if (formResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }

      const form = formResult.rows[0];

      // Get sections with items
      const sectionsResult = await query(
        `SELECT
          fs.id,
          fs.name,
          fs.display_order,
          fs.is_required,
          fs.description
        FROM form_sections fs
        WHERE fs.form_id = $1
        ORDER BY fs.display_order`,
        [id]
      );

      // Get items for each section
      for (const section of sectionsResult.rows) {
        const itemsResult = await query(
          `SELECT
            id,
            field_name,
            field_type,
            display_order,
            is_required,
            dropdown_options,
            default_value,
            help_text,
            alert_condition,
            alert_value,
            alert_message,
            conditional_logic
          FROM form_items
          WHERE section_id = $1
          ORDER BY display_order`,
          [section.id]
        );
        section.items = itemsResult.rows;
      }

      form.sections = sectionsResult.rows;

      res.json({
        success: true,
        data: form
      });
    } catch (error) {
      console.error('Get form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch form',
        error: error.message
      });
    }
  }

  /**
   * Create new form
   * POST /api/forms
   */
  static async create(req, res) {
    try {
      const { name, description, sections } = req.body;

      if (!name || !sections || sections.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Form name and sections are required'
        });
      }

      const result = await transaction(async (client) => {
        // Insert form
        const formResult = await client.query(
          `INSERT INTO forms (name, description, created_by)
          VALUES ($1, $2, $3)
          RETURNING id, name, created_at`,
          [name, description, req.user.id]
        );

        const form = formResult.rows[0];

        // Insert sections and items
        for (const section of sections) {
          const sectionResult = await client.query(
            `INSERT INTO form_sections (form_id, name, display_order, is_required, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id`,
            [form.id, section.name, section.display_order, section.is_required || false, section.description]
          );

          const sectionId = sectionResult.rows[0].id;

          // Insert items for this section
          if (section.items && section.items.length > 0) {
            for (const item of section.items) {
              await client.query(
                `INSERT INTO form_items
                (section_id, field_name, field_type, display_order, is_required,
                dropdown_options, default_value, help_text,
                alert_condition, alert_value, alert_message, conditional_logic)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                  sectionId,
                  item.field_name,
                  item.field_type || 'DROPDOWN',
                  item.display_order,
                  item.is_required || false,
                  item.dropdown_options || null,
                  item.default_value || null,
                  item.help_text || null,
                  item.alert_condition || 'NONE',
                  item.alert_value || null,
                  item.alert_message || null,
                  item.conditional_logic || {}
                ]
              );
            }
          }
        }

        return form;
      });

      res.status(201).json({
        success: true,
        message: 'Form created successfully',
        data: result
      });
    } catch (error) {
      console.error('Create form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create form',
        error: error.message
      });
    }
  }

  /**
   * Update form
   * PUT /api/forms/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, is_active } = req.body;

      await query(
        `UPDATE forms
        SET name = $1, description = $2, is_active = $3
        WHERE id = $4`,
        [name, description, is_active, id]
      );

      res.json({
        success: true,
        message: 'Form updated successfully'
      });
    } catch (error) {
      console.error('Update form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update form',
        error: error.message
      });
    }
  }

  /**
   * Delete form
   * DELETE /api/forms/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      // Check if form is assigned to any cranes
      const assignmentCheck = await query(
        'SELECT COUNT(*) as count FROM crane_form_assignments WHERE form_id = $1',
        [id]
      );

      if (assignmentCheck.rows[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete form that is assigned to cranes'
        });
      }

      await query('DELETE FROM forms WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Form deleted successfully'
      });
    } catch (error) {
      console.error('Delete form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete form',
        error: error.message
      });
    }
  }
}

module.exports = FormController;
