const { query } = require('../config/database');

class InspectionSectionController {
  static async getByForm(req, res) {
    try {
      const { formId } = req.params;

      const { rows } = await query(
        `SELECT id, name
         FROM form_sections
         WHERE form_id = $1
         ORDER BY display_order`,
        [formId]
      );

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = InspectionSectionController;
