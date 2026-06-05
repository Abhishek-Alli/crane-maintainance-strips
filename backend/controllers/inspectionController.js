const { pool, query } = require('../config/database');
const { sendLongMessage } = require('../utils/telegram');
const MaintenanceTracking = require('../models/MaintenanceTracking');


class InspectionController {
  static async create(req, res) {
    const client = await pool.connect();

    try {
      const {
        inspection_date,
        department_id,
        sub_department_id,
        shed_id,
        crane_id,
        recorded_by,
        items
      } = req.body;

      if (!inspection_date || department_id == null || shed_id == null || crane_id == null) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      if (!sub_department_id || isNaN(Number(sub_department_id)) || Number(sub_department_id) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Please select a Sub-Department'
        });
      }

      const userId = recorded_by || req.user?.id;

      // ✅ VALIDATION FOR NOT_OK
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.status === 'NOT_OK') {

            if (!item.remarks) {
              return res.status(400).json({
                success: false,
                message: `Remark required for item ${item.item_id}`
              });
            }

            if (!item.action_taken) {
              return res.status(400).json({
                success: false,
                message: `Action taken required for item ${item.item_id}`
              });
            }
          }
        }
      }

      const has_alerts =
        Array.isArray(items) && items.some(i => i.status === 'NOT_OK');

      await client.query('BEGIN');

      const { rows } = await client.query(
        `
      INSERT INTO inspections
      (inspection_date, department_id, sub_department_id, shed_id, crane_id, recorded_by, has_alerts)
      VALUES ($1::date, $2::integer, $3::integer, $4::integer, $5::integer, $6::integer, $7::boolean)
      RETURNING *
      `,
        [inspection_date, department_id, sub_department_id, shed_id, crane_id, userId, has_alerts]
      );

      const inspection = rows[0];

      if (Array.isArray(items)) {
        for (const item of items) {
          await client.query(
            `
          INSERT INTO inspection_values
          (inspection_id, section_id, item_id, selected_value, remarks, action_taken)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
            [
              inspection.id,
              item.section_id,
              item.item_id,
              item.status,
              item.remarks || null,
              item.action_taken || null
            ]
          );
        }
      }

      await client.query('COMMIT');
      // 🔥 Update Maintenance Tracking (IMPORTANT)
     const inspectionDateObj = new Date(rows[0].created_at);
      const year = inspectionDateObj.getFullYear();
      const month = inspectionDateObj.getMonth() + 1;

      // Ensure tracking exists for this crane & month
      await MaintenanceTracking.ensureTrackingExists(
        crane_id,
        year,
        month
      );

      // Mark as completed
      await MaintenanceTracking.manuallyMarkStatus(
        crane_id,
        year,
        month,
        'COMPLETED',
        userId,
        'Auto marked from inspection submission'
      );

      await InspectionController.sendInspectionTelegram(inspection.id);

      res.status(201).json({
        success: true,
        data: inspection
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('CREATE INSPECTION ERROR:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    } finally {
      client.release();
    }
  }
  /* ================================
     PART 2: GET INSPECTION BY ID
     ================================ */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const { rows: headerRows } = await query(
        `
        SELECT
          i.id,
          i.inspection_date,
          i.has_alerts,
          d.name AS department,
          s.name AS shed,
          c.crane_number,
          u.username AS recorded_by
        FROM inspections i
        JOIN departments d ON d.id = i.department_id
        JOIN sheds s ON s.id = i.shed_id
        JOIN cranes c ON c.id = i.crane_id
        LEFT JOIN users u ON u.id = i.recorded_by
        WHERE i.id = $1
        `,
        [id]
      );

      if (!headerRows.length) {
        return res.status(404).json({
          success: false,
          message: 'Inspection not found'
        });
      }

      const inspection = headerRows[0];

      const { rows } = await query(
        `
        SELECT
          s.id AS section_id,
          s.name AS section_name,
          i.id AS item_id,
          i.item_name AS item_name,
          v.selected_value,
          v.remarks,
          v.action_taken
        FROM inspection_values v
        JOIN inspection_sections s ON s.id = v.section_id
        JOIN inspection_items i ON i.id = v.item_id
        WHERE v.inspection_id = $1
        ORDER BY s.display_order, i.display_order
        `,
        [id]
      );

      const map = {};

      rows.forEach(r => {
        if (!map[r.section_id]) {
          map[r.section_id] = {
            section_id: r.section_id,
            section_name: r.section_name,
            items: []
          };
        }

        map[r.section_id].items.push({
          item_id: r.item_id,
          item_name: r.item_name,
          selected_value: r.selected_value,
          remarks: r.remarks,
          action_taken: r.action_taken
        });
      });

      inspection.sections = Object.values(map);

      res.json({
        success: true,
        data: inspection
      });

    } catch (error) {
      console.error('GET INSPECTION ERROR:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }


  /* ================================
     PART 3: GET ALL INSPECTIONS (Dashboard)
     ================================ */
  static async getAll(req, res) {
    try {
      const { start_date, end_date, limit } = req.query;

      const { rows } = await query(
        `
        SELECT
          i.id,
          i.inspection_date,
          i.has_alerts,
          d.name AS department,
          s.name AS shed,
          c.crane_number,
          u.username AS recorded_by
        FROM inspections i
        JOIN departments d ON d.id = i.department_id
        JOIN sheds s ON s.id = i.shed_id
        JOIN cranes c ON c.id = i.crane_id
        LEFT JOIN users u ON u.id = i.recorded_by
        WHERE ($1::date IS NULL OR DATE(i.inspection_date) >= $1::date)
          AND ($2::date IS NULL OR DATE(i.inspection_date) <= $2::date)
        ORDER BY i.inspection_date DESC
        LIMIT $3
        `,
        [
          start_date || null,
          end_date || null,
          limit || 100
        ]
      );

      res.json({
        success: true,
        data: rows
      });

    } catch (error) {
      console.error('GET ALL INSPECTIONS ERROR:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }


  /* ================================
     PART 4: TELEGRAM NOTIFICATION
     ================================ */
  static async sendInspectionTelegram(inspectionId) {
    try {
      const { rows: headerRows } = await query(
        `
        SELECT
          i.inspection_date,
          i.has_alerts,
          d.name        AS department,
          s.name        AS shed,
          c.crane_number,
          u.username    AS recorded_by
        FROM inspections i
        JOIN departments d ON d.id = i.department_id
        JOIN sheds       s ON s.id = i.shed_id
        JOIN cranes      c ON c.id = i.crane_id
        LEFT JOIN users  u ON u.id = i.recorded_by
        WHERE i.id = $1
        `,
        [inspectionId]
      );

      if (!headerRows.length) return;

      const insp = headerRows[0];

      const { rows } = await query(
        `
        SELECT
          sec.name       AS section,
          sec.display_order AS sec_order,
          itm.item_name  AS item,
          itm.display_order AS item_order,
          v.selected_value,
          v.remarks,
          v.action_taken
        FROM inspection_values v
        JOIN inspection_sections sec ON sec.id = v.section_id
        JOIN inspection_items    itm ON itm.id = v.item_id
        WHERE v.inspection_id = $1
        ORDER BY sec.display_order, itm.display_order
        `,
        [inspectionId]
      );

      const dateStr = new Date(insp.inspection_date)
        .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const notOkCount = rows.filter(r => r.selected_value === 'NOT_OK').length;
      const totalCount = rows.length;
      const statusIcon = insp.has_alerts ? '🚨' : '✅';

      // Group items by section
      const sections = {};
      rows.forEach(r => {
        if (!sections[r.section]) sections[r.section] = [];
        sections[r.section].push(r);
      });

      // Calculate column widths for table
      const pad = (str, len) => String(str).padEnd(len, ' ');
      const maxItem = Math.min(
        Math.max(10, ...rows.map(r => r.item.length)),
        28
      );

      const divider = `${'─'.repeat(12)}┼${'─'.repeat(maxItem + 2)}┼────────`;
      const header  = `${ pad('Section', 12) }│ ${ pad('Item', maxItem) }│ Status `;

      let tableLines = [header, divider];

      Object.entries(sections).forEach(([sectionName, items]) => {
        items.forEach((r, idx) => {
          const secCol  = idx === 0 ? pad(sectionName.slice(0, 12), 12) : pad('', 12);
          const itemCol = pad(r.item.slice(0, maxItem), maxItem);
          const result  = r.selected_value === 'NOT_OK' ? 'FAIL' : 'OK  ';
          tableLines.push(`${secCol}│ ${itemCol}│ ${result}`);
          if (r.selected_value === 'NOT_OK') {
            if (r.remarks)      tableLines.push(`${ pad('', 12) }│  📝 ${r.remarks.slice(0, maxItem + 20)}`);
            if (r.action_taken) tableLines.push(`${ pad('', 12) }│  🔧 ${r.action_taken.slice(0, maxItem + 20)}`);
          }
        });
        tableLines.push(divider);
      });

      const summary = notOkCount > 0
        ? `${totalCount - notOkCount}/${totalCount} OK  |  ${notOkCount} ISSUE${notOkCount > 1 ? 'S' : ''}`
        : `${totalCount}/${totalCount} OK  |  ALL CLEAR`;

      let msg =
        `${statusIcon} <b>Crane Inspection Submitted</b>\n` +
        `🏗️ <b>${insp.crane_number}</b>  |  ${insp.department}  |  ${insp.shed}\n` +
        `📅 ${dateStr}  |  👤 ${insp.recorded_by || '—'}\n` +
        `📊 ${summary}\n\n` +
        `<pre>${tableLines.join('\n')}</pre>`;

      await sendLongMessage(msg);

    } catch (err) {
      console.error('TELEGRAM ERROR:', err);
      throw err;
    }
  }

  static async resendTelegram(req, res) {
    try {
      const { id } = req.params;
      await InspectionController.sendInspectionTelegram(id);
      res.json({ success: true, message: `Telegram notification resent for inspection #${id}` });
    } catch (error) {
      console.error('Resend inspection telegram error:', error);
      res.status(500).json({ success: false, message: 'Failed to resend notification' });
    }
  }
}

module.exports = InspectionController;