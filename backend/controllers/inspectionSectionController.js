const { query } = require('../config/database');

class InspectionSectionController {

  // GET SECTIONS BY FORM
  static async getByForm(req, res) {
    try {
      const formId = parseInt(req.params.formId, 10);

      if (isNaN(formId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid form ID'
        });
      }

      const { rows } = await query(
        `
        SELECT
          id,
          name,
          display_order,
          is_required
        FROM form_sections
        WHERE form_id = $1
        ORDER BY display_order
        `,
        [formId]
      );

      res.json({
        success: true,
        data: rows
      });

    } catch (err) {
      console.error('GET FORM SECTIONS ERROR:', err);
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
}

module.exports = InspectionSectionController;