const { query } = require('../config/database');

class InspectionItemController {
  static async getBySection(req, res) {
    try {
      const { sectionId } = req.params;

      const { rows } = await query(
        `SELECT id, field_name
         FROM form_items
         WHERE section_id = $1
         ORDER BY display_order`,
        [sectionId]
      );

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = InspectionItemController;
