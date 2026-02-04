const { query } = require('../config/database');

class DepartmentController {
  static async getAll(req, res) {
    try {
      const { rows } = await query(
        'SELECT id, name FROM departments ORDER BY name'
      );

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = DepartmentController;
