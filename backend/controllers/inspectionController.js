/**
 * ============================================
 * INSPECTION CONTROLLER – CRANE MAINTENANCE
 * ============================================
 */

const { query, pool } = require('../config/database');
const { sendTelegramMessage } = require('../utils/telegram');
const dayjs = require('dayjs');

class InspectionController {

  // CREATE INSPECTION + SAVE ITEMS
  static async create(req, res) {
    const client = await pool.connect();
    try {
      const {
        inspection_date,
        department_id,
        shed_id,
        crane_id,
        recorded_by,
        items,
        has_alerts
      } = req.body;

      if (!inspection_date || department_id == null || shed_id == null || crane_id == null) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const userId = recorded_by || req.user?.id;
      const alertExists = Array.isArray(items) && items.some(i => i.status === 'NOT_OK');

      await client.query('BEGIN');

      // 1. Insert inspection header
      const { rows } = await client.query(
        `INSERT INTO inspections
         (inspection_date, department_id, shed_id, crane_id, recorded_by, has_alerts)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [inspection_date, department_id, shed_id, crane_id, userId, alertExists]
      );

      const inspection = rows[0];

      // 2. Save inspection items/values
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          await client.query(
            `INSERT INTO inspection_values
             (inspection_id, section_id, item_id, selected_value, remarks)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              inspection.id,
              item.section_id,
              item.item_id,
              item.status,
              item.remarks || null
            ]
          );
        }
      }

      await client.query('COMMIT');

      // Send response immediately – don't wait for Telegram
      res.status(201).json({
        success: true,
        data: inspection
      });

      // Fire-and-forget: send Telegram notification with full report
      InspectionController.sendInspectionTelegram(inspection.id).catch((err) => {
        console.error('Telegram inspection notification failed:', err.message);
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('CREATE INSPECTION ERROR:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      client.release();
    }
  }

  // GET RECENT INSPECTIONS
  static async getAllRecent(req, res) {
    try {
      const sql = `
        SELECT
          i.id,
          i.inspection_date,
          d.name AS department,
          s.name AS shed,
          c.crane_number,
          i.has_alerts
        FROM inspections i
        JOIN departments d ON d.id = i.department_id
        JOIN sheds s ON s.id = i.shed_id
        JOIN cranes c ON c.id = i.crane_id
        ORDER BY i.inspection_date DESC
        LIMIT 50
      `;

      const { rows } = await query(sql);

      res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('GET INSPECTIONS ERROR:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET INSPECTION BY ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const sql = `
        SELECT *
        FROM inspections
        WHERE id = $1
      `;

      const { rows } = await query(sql, [id]);

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: 'Inspection not found'
        });
      }

      res.json({
        success: true,
        data: rows[0]
      });

    } catch (error) {
      console.error('GET INSPECTION ERROR:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // SEND TELEGRAM NOTIFICATION AFTER INSPECTION SUBMIT
  static async sendInspectionTelegram(inspectionId) {
    // Fetch inspection header with names
    const { rows: headerRows } = await query(`
      SELECT
        i.inspection_date,
        i.has_alerts,
        u.username AS recorded_by,
        d.name AS department,
        s.name AS shed,
        c.crane_number
      FROM inspections i
      JOIN departments d ON d.id = i.department_id
      JOIN sheds s ON s.id = i.shed_id
      JOIN cranes c ON c.id = i.crane_id
      LEFT JOIN users u ON u.id = i.recorded_by
      WHERE i.id = $1
    `, [inspectionId]);

    if (!headerRows.length) return;
    const insp = headerRows[0];

    // Fetch all items grouped by section
    const { rows: itemRows } = await query(`
      SELECT
        fs.name AS section,
        fi.field_name AS item_name,
        iv.selected_value AS status,
        iv.remarks
      FROM inspection_values iv
      JOIN form_sections fs ON fs.id = iv.section_id
      JOIN form_items fi ON fi.id = iv.item_id
      WHERE iv.inspection_id = $1
      ORDER BY fs.display_order, fi.display_order
    `, [inspectionId]);

    // Group items by section
    const sections = {};
    itemRows.forEach((row) => {
      if (!sections[row.section]) sections[row.section] = [];
      sections[row.section].push(row);
    });

    // Build message
    const date = dayjs(insp.inspection_date).format('DD-MM-YYYY');
    const statusIcon = insp.has_alerts ? '🔴' : '🟢';
    const overallStatus = insp.has_alerts ? 'ISSUES FOUND' : 'ALL OK';

    let msg =
      `📝 <b>New Inspection Submitted</b>\n\n` +
      `Crane No: <b>${insp.crane_number}</b>\n` +
      `Shed: ${insp.shed}\n` +
      `Department: ${insp.department}\n` +
      `Date: ${date}\n` +
      `Recorded By: ${insp.recorded_by || '-'}\n` +
      `Overall: ${statusIcon} ${overallStatus}\n`;

    // Add each section with items
    const sectionNames = Object.keys(sections);
    for (const secName of sectionNames) {
      msg += `\n<b>▸ ${secName}</b>\n`;
      for (const item of sections[secName]) {
        const icon = item.status?.toUpperCase() === 'NOT_OK' ? '❌' : '✅';
        msg += `  ${icon} ${item.item_name}: ${item.status || '-'}`;
        if (item.remarks) msg += ` (${item.remarks})`;
        msg += `\n`;
      }
    }

    await sendTelegramMessage(msg);
  }
}

module.exports = InspectionController;
