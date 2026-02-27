const { query } = require('../config/database');

class InspectionItemController {

  // GET ITEMS BY SECTION (FORM ENGINE)
  static async getBySection(req, res) {
    try {
      const sectionId = parseInt(req.params.sectionId, 10);

      if (isNaN(sectionId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid section ID'
        });
      }

      const { rows } = await query(
        `
        SELECT
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
        ORDER BY display_order
        `,
        [sectionId]
      );

      res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('Error fetching form items:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = InspectionItemController;