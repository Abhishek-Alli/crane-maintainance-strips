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

      // Send Telegram notification (must await in serverless environment)
      try {
        await InspectionController.sendInspectionTelegram(inspection.id);
        console.log('Telegram notification sent for inspection:', inspection.id);
      } catch (telegramErr) {
        // Don't fail the inspection if Telegram fails
        console.error('Telegram notification failed:', telegramErr.message);
      }

      // Send response after Telegram
      res.status(201).json({
        success: true,
        data: inspection
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('CREATE INSPECTION ERROR:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      client.release();
    }
  }

  // GET RECENT INSPECTIONS (supports date range + filters)
  static async getAllRecent(req, res) {
    try {
      const { start_date, end_date, department_id, shed_id, crane_id, limit } = req.query;

      let sql = `
        SELECT
          i.id,
          i.inspection_date,
          d.name AS department,
          s.name AS shed,
          c.crane_number,
          i.has_alerts,
          i.alert_count,
          i.crane_status,
          i.remarks,
          u.username AS recorded_by,
          f.name AS form_name
        FROM inspections i
        JOIN departments d ON d.id = i.department_id
        JOIN sheds s ON s.id = i.shed_id
        JOIN cranes c ON c.id = i.crane_id
        LEFT JOIN users u ON u.id = i.recorded_by
        LEFT JOIN forms f ON f.id = i.form_id
        WHERE 1=1
      `;

      const values = [];
      let paramIdx = 1;

      if (start_date) {
        sql += ` AND DATE(i.inspection_date) >= $${paramIdx}`;
        values.push(start_date);
        paramIdx++;
      }
      if (end_date) {
        sql += ` AND DATE(i.inspection_date) <= $${paramIdx}`;
        values.push(end_date);
        paramIdx++;
      }
      if (department_id) {
        sql += ` AND i.department_id = $${paramIdx}`;
        values.push(department_id);
        paramIdx++;
      }
      if (shed_id) {
        sql += ` AND i.shed_id = $${paramIdx}`;
        values.push(shed_id);
        paramIdx++;
      }
      if (crane_id) {
        sql += ` AND i.crane_id = $${paramIdx}`;
        values.push(crane_id);
        paramIdx++;
      }

      sql += ` ORDER BY i.inspection_date DESC LIMIT $${paramIdx}`;
      values.push(parseInt(limit) || 200);

      const { rows } = await query(sql, values);

      res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('GET INSPECTIONS ERROR:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET INSPECTION BY ID (with full sections/items details)
  static async getById(req, res) {
    try {
      const { id } = req.params;

      // Fetch header with joined names
      const { rows: headerRows } = await query(`
        SELECT
          i.id, i.inspection_date, i.has_alerts, i.alert_count,
          i.crane_status, i.remarks,
          d.name AS department,
          s.name AS shed,
          c.crane_number,
          u.username AS recorded_by,
          f.name AS form_name
        FROM inspections i
        JOIN departments d ON d.id = i.department_id
        JOIN sheds s ON s.id = i.shed_id
        JOIN cranes c ON c.id = i.crane_id
        LEFT JOIN users u ON u.id = i.recorded_by
        LEFT JOIN forms f ON f.id = i.form_id
        WHERE i.id = $1
      `, [id]);

      if (!headerRows.length) {
        return res.status(404).json({
          success: false,
          message: 'Inspection not found'
        });
      }

      const inspection = headerRows[0];

      // Fetch all items grouped by section
      const { rows: itemRows } = await query(`
        SELECT
          fs.id AS section_id,
          fs.name AS section_name,
          fs.display_order AS section_order,
          fi.id AS item_id,
          fi.field_name AS item_name,
          fi.display_order AS item_order,
          iv.selected_value,
          iv.remarks
        FROM inspection_values iv
        JOIN form_sections fs ON fs.id = iv.section_id
        JOIN form_items fi ON fi.id = iv.item_id
        WHERE iv.inspection_id = $1
        ORDER BY fs.display_order, fi.display_order
      `, [id]);

      // Group items by section
      const sectionsMap = {};
      itemRows.forEach(row => {
        if (!sectionsMap[row.section_id]) {
          sectionsMap[row.section_id] = {
            section_id: row.section_id,
            section_name: row.section_name,
            items: []
          };
        }
        sectionsMap[row.section_id].items.push({
          item_id: row.item_id,
          item_name: row.item_name,
          selected_value: row.selected_value,
          remarks: row.remarks
        });
      });

      inspection.sections = Object.values(sectionsMap);

      res.json({
        success: true,
        data: inspection
      });

    } catch (error) {
      console.error('GET INSPECTION ERROR:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // SEND TELEGRAM NOTIFICATION AFTER INSPECTION SUBMIT
  static async sendInspectionTelegram(inspectionId) {
    console.log('Sending Telegram for inspection ID:', inspectionId);

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
