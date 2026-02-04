const { query } = require('../config/database');

class ShedController {
  static async getAll(req, res) {
    try {
      const { rows } = await query(
        `SELECT id, name FROM sheds ORDER BY name`
      );

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('SHED FETCH ERROR:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = ShedController;
