const { pool } = require('../config/database');

class InspectionValueController {
  static async saveValues(req, res) {
    const client = await pool.connect();

    try {
      const { inspectionId } = req.params;
      const { values } = req.body;

      if (!Array.isArray(values) || !values.length) {
        return res.status(400).json({
          success: false,
          message: 'Inspection values required'
        });
      }

      await client.query('BEGIN');

      for (const v of values) {
        const {
          section_id,
          item_id,
          selected_value,
          remarks
        } = v;

        await client.query(
          `INSERT INTO inspection_values
           (inspection_id, section_id, item_id, selected_value, remarks)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            inspectionId,
            section_id,
            item_id,
            selected_value,
            remarks || null
          ]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Inspection values saved'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('SAVE INSPECTION VALUES ERROR:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    } finally {
      client.release();
    }
  }
}

module.exports = InspectionValueController;
