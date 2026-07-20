const { query, transaction } = require('../config/database');
const {
  sendHbmChecksheetNotification,
  sendCoolingBedNotification,
  sendMillMechNotification,
  sendRollingStandNotification,
  sendBarBundleNotification,
  sendBeforeRollingNotification,
  sendOilLevelNotification,
  sendDcMotorAirflowNotification,
  sendPumpParamNotification,
  sendWaterParamNotification,
  sendPhMaintNotification,
  sendTransformerNotification,
  sendRoughingGbTempNotification,
  sendBreakdownNotification,
} = require('../utils/telegram');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const LOGO_PATH = path.join(__dirname, '../assets/srj-logo.png');

class HbmController {

  // ==========================================
  // DASHBOARD
  // ==========================================

  static async getDashboardStats(req, res) {
    try {
      const [machinesResult, todayResult, issuesResult, templatesResult, actionPendingResult] = await Promise.all([
        query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active FROM hbm_machines'),
        query(`SELECT COUNT(*) as total FROM hbm_checksheets WHERE checksheet_date = CURRENT_DATE`),
        query(`SELECT COUNT(*) as total FROM hbm_checksheets WHERE has_issues = true AND checksheet_date >= CURRENT_DATE - INTERVAL '7 days'`),
        query('SELECT COUNT(*) as total FROM hbm_checksheet_templates WHERE is_active = true'),
        query(`SELECT COUNT(*) as total FROM hbm_checksheet_values WHERE is_issue = true AND (action_taken IS NULL OR action_taken = '')`)
      ]);

      const [dcTodayResult] = await Promise.all([
        query(`SELECT COUNT(*) as total FROM hbm_dc_motor_logs WHERE log_date = CURRENT_DATE`)
      ]);

      res.json({
        success: true,
        data: {
          total_machines: parseInt(machinesResult.rows[0].total),
          active_machines: parseInt(machinesResult.rows[0].active),
          today_checksheets: parseInt(todayResult.rows[0].total),
          weekly_issues: parseInt(issuesResult.rows[0].total),
          active_templates: parseInt(templatesResult.rows[0].total),
          action_pending: parseInt(actionPendingResult.rows[0].total),
          dc_motor_today: parseInt(dcTodayResult.rows[0].total)
        }
      });
    } catch (error) {
      console.error('HBM dashboard stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
  }

  static async getRecentChecksheets(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const result = await query(
        `SELECT
          cs.id,
          cs.checksheet_date,
          cs.checksheet_time,
          cs.shift,
          cs.status,
          cs.has_issues,
          cs.issue_count,
          cs.remarks,
          cs.created_at,
          m.machine_name,
          m.machine_code,
          t.name as template_name,
          u.username as filled_by
         FROM hbm_checksheets cs
         JOIN hbm_machines m ON cs.machine_id = m.id
         JOIN hbm_checksheet_templates t ON cs.template_id = t.id
         JOIN users u ON cs.filled_by = u.id
         ORDER BY cs.created_at DESC
         LIMIT $1`,
        [limit]
      );

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('HBM recent checksheets error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch recent checksheets' });
    }
  }

  // ==========================================
  // MACHINES
  // ==========================================

  static async getMachines(req, res) {
    try {
      const { active_only } = req.query;
      let sql = `
        SELECT m.*, COUNT(mt.id) as template_count
        FROM hbm_machines m
        LEFT JOIN hbm_machine_templates mt ON m.id = mt.machine_id
      `;
      if (active_only === 'true') sql += ' WHERE m.is_active = true';
      sql += ' GROUP BY m.id ORDER BY m.machine_name';

      const result = await query(sql);
      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('HBM get machines error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch machines' });
    }
  }

  static async getMachineById(req, res) {
    try {
      const { id } = req.params;
      const result = await query(
        `SELECT m.*,
          COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name, 'frequency', t.frequency)) FILTER (WHERE t.id IS NOT NULL), '[]') as templates
         FROM hbm_machines m
         LEFT JOIN hbm_machine_templates mt ON m.id = mt.machine_id
         LEFT JOIN hbm_checksheet_templates t ON mt.template_id = t.id
         WHERE m.id = $1 GROUP BY m.id`,
        [id]
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Machine not found' });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('HBM get machine error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch machine' });
    }
  }

  static async createMachine(req, res) {
    try {
      const { machine_name, machine_code, location, department, machine_type, manufacturer, model, serial_number, installation_date } = req.body;
      if (!machine_name || !machine_code) return res.status(400).json({ success: false, message: 'Machine name and code are required' });

      const existing = await query('SELECT id FROM hbm_machines WHERE machine_code = $1', [machine_code]);
      if (existing.rows.length > 0) return res.status(400).json({ success: false, message: 'Machine code already exists' });

      const result = await query(
        `INSERT INTO hbm_machines (machine_name, machine_code, location, department, machine_type, manufacturer, model, serial_number, installation_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [machine_name, machine_code, location, department, machine_type, manufacturer, model, serial_number, installation_date]
      );
      res.status(201).json({ success: true, message: 'Machine created', data: result.rows[0] });
    } catch (error) {
      console.error('HBM create machine error:', error);
      res.status(500).json({ success: false, message: 'Failed to create machine' });
    }
  }

  static async updateMachine(req, res) {
    try {
      const { id } = req.params;
      const { machine_name, machine_code, location, department, machine_type, manufacturer, model, serial_number, installation_date, is_active } = req.body;
      const result = await query(
        `UPDATE hbm_machines SET
          machine_name = COALESCE($1, machine_name),
          machine_code = COALESCE($2, machine_code),
          location = COALESCE($3, location),
          department = COALESCE($4, department),
          machine_type = COALESCE($5, machine_type),
          manufacturer = COALESCE($6, manufacturer),
          model = COALESCE($7, model),
          serial_number = COALESCE($8, serial_number),
          installation_date = COALESCE($9, installation_date),
          is_active = COALESCE($10, is_active),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $11 RETURNING *`,
        [machine_name, machine_code, location, department, machine_type, manufacturer, model, serial_number, installation_date, is_active, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Machine not found' });
      res.json({ success: true, message: 'Machine updated', data: result.rows[0] });
    } catch (error) {
      console.error('HBM update machine error:', error);
      res.status(500).json({ success: false, message: 'Failed to update machine' });
    }
  }

  static async deleteMachine(req, res) {
    try {
      const { id } = req.params;
      const result = await query('DELETE FROM hbm_machines WHERE id = $1 RETURNING id, machine_name', [id]);
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Machine not found' });
      res.json({ success: true, message: 'Machine deleted', data: result.rows[0] });
    } catch (error) {
      console.error('HBM delete machine error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete machine' });
    }
  }

  // ==========================================
  // TEMPLATES
  // ==========================================

  static async getTemplates(req, res) {
    try {
      const result = await query(
        `SELECT t.*, u.username as created_by_name,
          COUNT(DISTINCT s.id) as section_count,
          COUNT(DISTINCT i.id) as item_count
         FROM hbm_checksheet_templates t
         LEFT JOIN users u ON t.created_by = u.id
         LEFT JOIN hbm_checksheet_sections s ON t.id = s.template_id
         LEFT JOIN hbm_checksheet_items i ON s.id = i.section_id
         WHERE t.is_active = true
         GROUP BY t.id, u.username ORDER BY t.name`
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('HBM get templates error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
  }

  // Returns template with sections → subsections → items hierarchy
  static async getTemplateById(req, res) {
    try {
      const { id } = req.params;

      const templateResult = await query('SELECT * FROM hbm_checksheet_templates WHERE id = $1', [id]);
      if (templateResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Template not found' });

      // Get sections
      const sectionsResult = await query(
        'SELECT * FROM hbm_checksheet_sections WHERE template_id = $1 ORDER BY display_order',
        [id]
      );

      const sections = [];
      for (const section of sectionsResult.rows) {
        // Get subsections for this section
        const subResult = await query(
          'SELECT * FROM hbm_checksheet_subsections WHERE section_id = $1 ORDER BY display_order',
          [section.id]
        );

        const subsections = [];
        for (const sub of subResult.rows) {
          const itemsResult = await query(
            'SELECT * FROM hbm_checksheet_items WHERE subsection_id = $1 ORDER BY display_order',
            [sub.id]
          );
          subsections.push({ ...sub, items: itemsResult.rows });
        }

        // Get direct items (no subsection)
        const directItemsResult = await query(
          'SELECT * FROM hbm_checksheet_items WHERE section_id = $1 AND subsection_id IS NULL ORDER BY display_order',
          [section.id]
        );

        sections.push({ ...section, subsections, items: directItemsResult.rows });
      }

      res.json({ success: true, data: { ...templateResult.rows[0], sections } });
    } catch (error) {
      console.error('HBM get template error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch template' });
    }
  }

  // ==========================================
  // CHECKSHEETS (Universal)
  // ==========================================

  static async getChecksheets(req, res) {
    try {
      const { machine_id, date_from, date_to, status, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (machine_id) { conditions.push(`cs.machine_id = $${paramIdx++}`); params.push(machine_id); }
      if (date_from) { conditions.push(`cs.checksheet_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to) { conditions.push(`cs.checksheet_date <= $${paramIdx++}`); params.push(date_to); }
      if (status) { conditions.push(`cs.status = $${paramIdx++}`); params.push(status); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT cs.id, cs.checksheet_date, cs.checksheet_time, cs.shift, cs.status,
          cs.has_issues, cs.issue_count, cs.remarks, cs.created_at,
          m.machine_name, m.machine_code, t.name as template_name, u.username as filled_by
         FROM hbm_checksheets cs
         JOIN hbm_machines m ON cs.machine_id = m.id
         JOIN hbm_checksheet_templates t ON cs.template_id = t.id
         JOIN users u ON cs.filled_by = u.id
         ${whereClause}
         ORDER BY cs.checksheet_date DESC, cs.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('HBM get checksheets error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch checksheets' });
    }
  }

  static async getChecksheetById(req, res) {
    try {
      const { id } = req.params;

      const csResult = await query(
        `SELECT cs.*, m.machine_name, m.machine_code, m.location,
          t.name as template_name, u.username as filled_by_name
         FROM hbm_checksheets cs
         JOIN hbm_machines m ON cs.machine_id = m.id
         JOIN hbm_checksheet_templates t ON cs.template_id = t.id
         JOIN users u ON cs.filled_by = u.id
         WHERE cs.id = $1`,
        [id]
      );

      if (csResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Checksheet not found' });

      const valuesResult = await query(
        `SELECT v.*, i.check_point, i.unit, i.is_critical,
          s.name as section_name, s.display_order as section_order,
          ss.name as subsection_name, ss.display_order as subsection_order
         FROM hbm_checksheet_values v
         JOIN hbm_checksheet_items i ON v.item_id = i.id
         JOIN hbm_checksheet_sections s ON i.section_id = s.id
         LEFT JOIN hbm_checksheet_subsections ss ON i.subsection_id = ss.id
         WHERE v.checksheet_id = $1
         ORDER BY s.display_order, COALESCE(ss.display_order, 0), i.display_order`,
        [id]
      );

      res.json({ success: true, data: { ...csResult.rows[0], values: valuesResult.rows } });
    } catch (error) {
      console.error('HBM get checksheet error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch checksheet' });
    }
  }

  static async createChecksheet(req, res) {
    try {
      const { machine_id, template_id, checksheet_date, checksheet_time, shift, remarks, items } = req.body;

      if (!machine_id || !template_id || !checksheet_date || !checksheet_time) {
        return res.status(400).json({ success: false, message: 'Machine, template, date, and time are required' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Checksheet items are required' });
      }

      // Validate NOT_OK items have remark + action_taken
      for (const item of items) {
        if (item.value === 'NOT_OK') {
          if (!item.remark || item.remark.trim() === '') {
            return res.status(400).json({ success: false, message: 'Remark is compulsory for all NOT OK items' });
          }
          if (!item.action_taken || item.action_taken.trim() === '') {
            return res.status(400).json({ success: false, message: 'Action Taken is compulsory for all NOT OK items' });
          }
        }
      }

      let checksheet;
      await transaction(async (client) => {
        const issueCount = items.filter(i => i.value === 'NOT_OK').length;
        const hasIssues = issueCount > 0;
        const hasCritical = items.some(i => i.value === 'NOT_OK' && i.is_critical);
        const status = issueCount === 0 ? 'OK' : (hasCritical ? 'CRITICAL' : 'ATTENTION_REQUIRED');

        const csResult = await client.query(
          `INSERT INTO hbm_checksheets (machine_id, template_id, checksheet_date, checksheet_time, shift, status, has_issues, issue_count, remarks, filled_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [machine_id, template_id, checksheet_date, checksheet_time, shift || 'GENERAL', status, hasIssues, issueCount, remarks, req.user.id]
        );

        checksheet = csResult.rows[0];

        for (const item of items) {
          await client.query(
            `INSERT INTO hbm_checksheet_values (checksheet_id, item_id, value, is_issue, remark, action_taken)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              checksheet.id,
              item.item_id,
              item.value,
              item.value === 'NOT_OK',
              item.remark || null,
              item.action_taken || null
            ]
          );
        }
      });

      res.status(201).json({ success: true, message: 'Checksheet submitted successfully', data: checksheet });
    } catch (error) {
      console.error('HBM create checksheet error:', error);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'A checksheet for this machine, template, date and shift already exists' });
      }
      res.status(500).json({ success: false, message: 'Failed to submit checksheet' });
    }
  }

  // ==========================================
  // MACHINE-TEMPLATE ASSIGNMENT
  // ==========================================

  static async getMachineTemplates(req, res) {
    try {
      const { id } = req.params;
      const result = await query(
        `SELECT t.* FROM hbm_checksheet_templates t
         JOIN hbm_machine_templates mt ON t.id = mt.template_id
         WHERE mt.machine_id = $1 AND t.is_active = true ORDER BY t.name`,
        [id]
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('HBM get machine templates error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch machine templates' });
    }
  }

  static async assignTemplate(req, res) {
    try {
      const { id } = req.params;
      const { template_id } = req.body;
      if (!template_id) return res.status(400).json({ success: false, message: 'Template ID is required' });

      const result = await query(
        `INSERT INTO hbm_machine_templates (machine_id, template_id)
         VALUES ($1,$2) ON CONFLICT (machine_id, template_id) DO NOTHING RETURNING *`,
        [id, template_id]
      );
      res.status(201).json({ success: true, message: 'Template assigned', data: result.rows[0] });
    } catch (error) {
      console.error('HBM assign template error:', error);
      res.status(500).json({ success: false, message: 'Failed to assign template' });
    }
  }

  // ==========================================
  // DC MOTOR LOGS
  // ==========================================

  static async getDcMotorLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (date_from) { conditions.push(`l.log_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to) { conditions.push(`l.log_date <= $${paramIdx++}`); params.push(date_to); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(di.id) as total_items,
          COUNT(di.id) FILTER (WHERE di.status = 'NOT_OK') as not_ok_count
         FROM hbm_dc_motor_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_dc_motor_items di ON di.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('HBM get DC motor logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch DC motor logs' });
    }
  }

  static async getDcMotorLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_dc_motor_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );

      if (logResult.rows.length === 0) return res.status(404).json({ success: false, message: 'DC Motor log not found' });

      const itemsResult = await query(
        `SELECT * FROM hbm_dc_motor_items WHERE log_id = $1
         ORDER BY block_name, section_name, item_name`,
        [id]
      );

      res.json({ success: true, data: { ...logResult.rows[0], items: itemsResult.rows } });
    } catch (error) {
      console.error('HBM get DC motor log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch DC motor log' });
    }
  }

  static async createDcMotorLog(req, res) {
    try {
      const { log_date, log_time, shift, heat_start, heat_end, remarks, items } = req.body;

      if (!log_date || !log_time || !shift) {
        return res.status(400).json({ success: false, message: 'Date, time, and shift are required' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one check item is required' });
      }

      // Validate NOT_OK items
      for (const item of items) {
        if (item.status === 'NOT_OK') {
          if (!item.remark || item.remark.trim() === '') {
            return res.status(400).json({ success: false, message: `Remark is compulsory for NOT OK item: ${item.item_name}` });
          }
          if (!item.action_taken || item.action_taken.trim() === '') {
            return res.status(400).json({ success: false, message: `Action Taken is compulsory for NOT OK item: ${item.item_name}` });
          }
        }
      }

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_dc_motor_logs (log_date, log_time, shift, heat_start, heat_end, remarks, filled_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [log_date, log_time, shift, heat_start || null, heat_end || null, remarks || null, req.user.id]
        );

        log = logResult.rows[0];

        for (const item of items) {
          await client.query(
            `INSERT INTO hbm_dc_motor_items (log_id, block_name, section_name, item_name, status, remark, action_taken)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [log.id, item.block_name, item.section_name, item.item_name, item.status, item.remark || null, item.action_taken || null]
          );
        }
      });

      res.status(201).json({ success: true, message: 'DC Motor log submitted successfully', data: log });

      // Fire-and-forget Telegram notification
      sendHbmChecksheetNotification({
        checksheetType: 'DC Motor',
        date: log_date, time: log_time, shift,
        filledBy: req.user.username,
        submittedAt: new Date(),
        remarks,
        items
      }).catch((e) => console.error('Telegram DC Motor notify error:', e));
    } catch (error) {
      console.error('HBM create DC motor log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit DC motor log' });
    }
  }

  // ==========================================
  // COOLING BED LOGS
  // ==========================================

  static async getCoolingBedLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (date_from) { conditions.push(`l.log_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to)   { conditions.push(`l.log_date <= $${paramIdx++}`); params.push(date_to); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(i.id) as total_items,
          COUNT(i.id) FILTER (WHERE i.status = 'NOT_OK') as not_ok_count
         FROM hbm_cooling_bed_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_cooling_bed_items i ON i.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Cooling Bed get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Cooling Bed logs' });
    }
  }

  static async getCoolingBedLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_cooling_bed_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );

      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Cooling Bed log not found' });

      const itemsResult = await query(
        `SELECT * FROM hbm_cooling_bed_items WHERE log_id = $1
         ORDER BY section_name, block_name, item_name`,
        [id]
      );

      res.json({ success: true, data: { ...logResult.rows[0], items: itemsResult.rows } });
    } catch (error) {
      console.error('Cooling Bed get log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Cooling Bed log' });
    }
  }

  static async createCoolingBedLog(req, res) {
    try {
      const {
        log_date, log_time, shift,
        sec1_remark, sec1_result, sec1_checked_by,
        sec2_remark, sec2_result, sec2_checked_by,
        sec3_remark, sec3_result, sec3_checked_by,
        sec4_remark, sec4_result, sec4_checked_by,
        sec5_remark, sec5_result, sec5_checked_by,
        sec6_remark, sec6_result, sec6_checked_by,
        items
      } = req.body;

      if (!log_date || !log_time || !shift)
        return res.status(400).json({ success: false, message: 'Date, time, and shift are required' });

      if (!items || !Array.isArray(items) || items.length === 0)
        return res.status(400).json({ success: false, message: 'At least one check item is required' });

      for (const item of items) {
        if (item.status === 'NOT_OK') {
          if (!item.remark || item.remark.trim() === '')
            return res.status(400).json({ success: false, message: `Remark is compulsory for NOT OK item: ${item.item_name}` });
          if (!item.action_taken || item.action_taken.trim() === '')
            return res.status(400).json({ success: false, message: `Action Taken is compulsory for NOT OK item: ${item.item_name}` });
        }
      }

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_cooling_bed_logs
             (log_date, log_time, shift,
              sec1_remark, sec1_result, sec1_checked_by,
              sec2_remark, sec2_result, sec2_checked_by,
              sec3_remark, sec3_result, sec3_checked_by,
              sec4_remark, sec4_result, sec4_checked_by,
              sec5_remark, sec5_result, sec5_checked_by,
              sec6_remark, sec6_result, sec6_checked_by,
              filled_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *`,
          [
            log_date, log_time, shift,
            sec1_remark || null, sec1_result || null, sec1_checked_by || null,
            sec2_remark || null, sec2_result || null, sec2_checked_by || null,
            sec3_remark || null, sec3_result || null, sec3_checked_by || null,
            sec4_remark || null, sec4_result || null, sec4_checked_by || null,
            sec5_remark || null, sec5_result || null, sec5_checked_by || null,
            sec6_remark || null, sec6_result || null, sec6_checked_by || null,
            req.user.id
          ]
        );

        log = logResult.rows[0];

        for (const item of items) {
          await client.query(
            `INSERT INTO hbm_cooling_bed_items
               (log_id, section_name, block_name, item_name, status, remark, action_taken)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [log.id, item.section_name, item.block_name, item.item_name, item.status,
             item.remark || null, item.action_taken || null]
          );
        }
      });

      res.status(201).json({ success: true, message: 'Cooling Bed log submitted successfully', data: log });

      sendCoolingBedNotification({
        date: log_date, time: log_time, shift,
        filledBy: req.user.username,
        submittedAt: new Date(),
        items
      }).catch((e) => console.error('Telegram Cooling Bed notify error:', e));
    } catch (error) {
      console.error('Cooling Bed create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Cooling Bed log' });
    }
  }

  // ==========================================
  // MILL MECHANICAL LOGS
  // ==========================================

  static async getMillMechLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (date_from) { conditions.push(`l.log_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to)   { conditions.push(`l.log_date <= $${paramIdx++}`); params.push(date_to); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(i.id) as total_items,
          COUNT(i.id) FILTER (WHERE i.status = 'NOT_OK') as not_ok_count
         FROM hbm_mill_mech_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_mill_mech_items i ON i.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Mill Mech get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Mill Mechanical logs' });
    }
  }

  static async getMillMechLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_mill_mech_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );

      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Mill Mechanical log not found' });

      const itemsResult = await query(
        `SELECT * FROM hbm_mill_mech_items WHERE log_id = $1
         ORDER BY section_name, block_name, item_name`,
        [id]
      );

      res.json({ success: true, data: { ...logResult.rows[0], items: itemsResult.rows } });
    } catch (error) {
      console.error('Mill Mech get log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Mill Mechanical log' });
    }
  }

  static async createMillMechLog(req, res) {
    try {
      const {
        log_date, log_time, shift,
        sec1_remark, sec1_result, sec1_checked_by,
        sec2_remark, sec2_result, sec2_checked_by,
        sec3_remark, sec3_result, sec3_checked_by,
        sec4_remark, sec4_result, sec4_checked_by,
        sec5_remark, sec5_result, sec5_checked_by,
        items
      } = req.body;

      if (!log_date || !log_time || !shift) {
        return res.status(400).json({ success: false, message: 'Date, time, and shift are required' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one check item is required' });
      }

      for (const item of items) {
        if (item.status === 'NOT_OK') {
          if (!item.remark || item.remark.trim() === '')
            return res.status(400).json({ success: false, message: `Remark is compulsory for NOT OK item: ${item.item_name}` });
          if (!item.action_taken || item.action_taken.trim() === '')
            return res.status(400).json({ success: false, message: `Action Taken is compulsory for NOT OK item: ${item.item_name}` });
        }
      }

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_mill_mech_logs
             (log_date, log_time, shift,
              sec1_remark, sec1_result, sec1_checked_by,
              sec2_remark, sec2_result, sec2_checked_by,
              sec3_remark, sec3_result, sec3_checked_by,
              sec4_remark, sec4_result, sec4_checked_by,
              sec5_remark, sec5_result, sec5_checked_by,
              filled_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
          [
            log_date, log_time, shift,
            sec1_remark || null, sec1_result || null, sec1_checked_by || null,
            sec2_remark || null, sec2_result || null, sec2_checked_by || null,
            sec3_remark || null, sec3_result || null, sec3_checked_by || null,
            sec4_remark || null, sec4_result || null, sec4_checked_by || null,
            sec5_remark || null, sec5_result || null, sec5_checked_by || null,
            req.user.id
          ]
        );

        log = logResult.rows[0];

        for (const item of items) {
          await client.query(
            `INSERT INTO hbm_mill_mech_items
               (log_id, section_name, block_name, item_name, status, remark, action_taken)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [log.id, item.section_name, item.block_name, item.item_name, item.status,
             item.remark || null, item.action_taken || null]
          );
        }
      });

      res.status(201).json({ success: true, message: 'Mill Mechanical log submitted successfully', data: log });

      sendMillMechNotification({
        date: log_date, time: log_time, shift,
        filledBy: req.user.username,
        submittedAt: new Date(),
        items
      }).catch((e) => console.error('Telegram Mill Mech notify error:', e));
    } catch (error) {
      console.error('Mill Mech create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Mill Mechanical log' });
    }
  }

  // ==========================================
  // ROLLING STAND LOGS
  // ==========================================

  static async getRollingStandLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (date_from) { conditions.push(`l.log_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to)   { conditions.push(`l.log_date <= $${paramIdx++}`); params.push(date_to); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(i.id) as total_items,
          COUNT(i.id) FILTER (WHERE i.status = 'NOT_OK') as not_ok_count
         FROM hbm_rolling_stand_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_rolling_stand_items i ON i.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Rolling Stand get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Rolling Stand logs' });
    }
  }

  static async getRollingStandLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_rolling_stand_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );

      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Rolling Stand log not found' });

      const itemsResult = await query(
        `SELECT * FROM hbm_rolling_stand_items WHERE log_id = $1
         ORDER BY section_name, block_name, item_name`,
        [id]
      );

      res.json({ success: true, data: { ...logResult.rows[0], items: itemsResult.rows } });
    } catch (error) {
      console.error('Rolling Stand get log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Rolling Stand log' });
    }
  }

  static async createRollingStandLog(req, res) {
    try {
      const {
        log_date, log_time, shift,
        sec1_remark, sec1_result, sec1_checked_by,
        sec2_remark, sec2_result, sec2_checked_by,
        items
      } = req.body;

      if (!log_date || !log_time || !shift) {
        return res.status(400).json({ success: false, message: 'Date, time, and shift are required' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one check item is required' });
      }

      for (const item of items) {
        if (item.status === 'NOT_OK') {
          if (!item.remark || item.remark.trim() === '')
            return res.status(400).json({ success: false, message: `Remark is compulsory for NOT OK item: ${item.item_name}` });
          if (!item.action_taken || item.action_taken.trim() === '')
            return res.status(400).json({ success: false, message: `Action Taken is compulsory for NOT OK item: ${item.item_name}` });
        }
      }

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_rolling_stand_logs
             (log_date, log_time, shift,
              sec1_remark, sec1_result, sec1_checked_by,
              sec2_remark, sec2_result, sec2_checked_by,
              filled_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [
            log_date, log_time, shift,
            sec1_remark || null, sec1_result || null, sec1_checked_by || null,
            sec2_remark || null, sec2_result || null, sec2_checked_by || null,
            req.user.id
          ]
        );

        log = logResult.rows[0];

        for (const item of items) {
          await client.query(
            `INSERT INTO hbm_rolling_stand_items
               (log_id, section_name, block_name, item_name, status, remark, action_taken)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [log.id, item.section_name, item.block_name, item.item_name, item.status,
             item.remark || null, item.action_taken || null]
          );
        }
      });

      res.status(201).json({ success: true, message: 'Rolling Stand log submitted successfully', data: log });

      sendRollingStandNotification({
        date: log_date, time: log_time, shift,
        filledBy: req.user.username,
        submittedAt: new Date(),
        items
      }).catch((e) => console.error('Telegram Rolling Stand notify error:', e));
    } catch (error) {
      console.error('Rolling Stand create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Rolling Stand log' });
    }
  }

  // ==========================================
  // PUMPHOUSE CHECKSHEET LOGS
  // ==========================================

  static async getPumpHouseLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (date_from) { conditions.push(`l.log_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to)   { conditions.push(`l.log_date <= $${paramIdx++}`); params.push(date_to); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(i.id) as total_items,
          COUNT(i.id) FILTER (WHERE i.status = 'NOT_OK') as not_ok_count
         FROM hbm_pumphouse_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_pumphouse_items i ON i.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Pumphouse get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Pumphouse logs' });
    }
  }

  static async getPumpHouseLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_pumphouse_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );

      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Pumphouse log not found' });

      const itemsResult = await query(
        `SELECT * FROM hbm_pumphouse_items WHERE log_id = $1
         ORDER BY section_name, block_name, item_name`,
        [id]
      );

      res.json({ success: true, data: { ...logResult.rows[0], items: itemsResult.rows } });
    } catch (error) {
      console.error('Pumphouse get log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Pumphouse log' });
    }
  }

  static async createPumpHouseLog(req, res) {
    try {
      const {
        log_date, checked_by,
        sec1_result, sec2_result, sec3_result, sec4_result,
        sec5_result, sec6_result, sec7_result, sec8_result,
        sec9_result, sec10_result, sec11_result, sec12_result,
        items
      } = req.body;

      if (!log_date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one check item is required' });
      }

      for (const item of items) {
        if (item.status === 'NOT_OK') {
          if (!item.remark || item.remark.trim() === '')
            return res.status(400).json({ success: false, message: `Remark is compulsory for NOT OK item: ${item.item_name}` });
          if (!item.action_taken || item.action_taken.trim() === '')
            return res.status(400).json({ success: false, message: `Action Taken is compulsory for NOT OK item: ${item.item_name}` });
        }
      }

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_pumphouse_logs
             (log_date, checked_by,
              sec1_result, sec2_result, sec3_result, sec4_result,
              sec5_result, sec6_result, sec7_result, sec8_result,
              sec9_result, sec10_result, sec11_result, sec12_result,
              filled_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
          [
            log_date, checked_by || null,
            sec1_result  || null, sec2_result  || null, sec3_result  || null, sec4_result  || null,
            sec5_result  || null, sec6_result  || null, sec7_result  || null, sec8_result  || null,
            sec9_result  || null, sec10_result || null, sec11_result || null, sec12_result || null,
            req.user.id
          ]
        );

        log = logResult.rows[0];

        for (const item of items) {
          await client.query(
            `INSERT INTO hbm_pumphouse_items
               (log_id, section_name, block_name, item_name, status, remark, action_taken, block_remark)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [log.id, item.section_name, item.block_name, item.item_name,
             item.status, item.remark || null, item.action_taken || null, item.block_remark || null]
          );
        }
      });

      res.status(201).json({ success: true, message: 'Pumphouse log submitted successfully', data: log });

      sendHbmChecksheetNotification({
        checksheetType: 'Pumphouse',
        date: log_date,
        filledBy: req.user.username,
        submittedAt: new Date(),
        items
      }).catch((e) => console.error('Telegram Pumphouse notify error:', e));
    } catch (error) {
      console.error('Pumphouse create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Pumphouse log' });
    }
  }
  // ==========================================
  // BAR BUNDLE AREA CHECKSHEET LOGS
  // ==========================================

  static async getBarBundleLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (date_from) { conditions.push(`l.log_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to)   { conditions.push(`l.log_date <= $${paramIdx++}`); params.push(date_to); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(i.id) as total_items,
          COUNT(i.id) FILTER (WHERE i.status = 'NOT_OK') as not_ok_count
         FROM hbm_bar_bundle_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_bar_bundle_items i ON i.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Bar Bundle get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Bar Bundle logs' });
    }
  }

  static async getBarBundleLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_bar_bundle_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );

      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Bar Bundle log not found' });

      const itemsResult = await query(
        `SELECT * FROM hbm_bar_bundle_items WHERE log_id = $1
         ORDER BY section_name, block_name, item_name`,
        [id]
      );

      res.json({ success: true, data: { ...logResult.rows[0], items: itemsResult.rows } });
    } catch (error) {
      console.error('Bar Bundle get log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Bar Bundle log' });
    }
  }

  static async createBarBundleLog(req, res) {
    try {
      const {
        log_date, checked_by,
        sec1_result, sec2_result, sec3_result, sec4_result,
        items
      } = req.body;

      if (!log_date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one check item is required' });
      }

      for (const item of items) {
        if (item.status === 'NOT_OK') {
          if (!item.remark || item.remark.trim() === '')
            return res.status(400).json({ success: false, message: `Remark is compulsory for NOT OK item: ${item.item_name}` });
          if (!item.action_taken || item.action_taken.trim() === '')
            return res.status(400).json({ success: false, message: `Action Taken is compulsory for NOT OK item: ${item.item_name}` });
        }
      }

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_bar_bundle_logs
             (log_date, checked_by, sec1_result, sec2_result, sec3_result, sec4_result, filled_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [
            log_date, checked_by || null,
            sec1_result || null, sec2_result || null, sec3_result || null, sec4_result || null,
            req.user.id
          ]
        );

        log = logResult.rows[0];

        for (const item of items) {
          await client.query(
            `INSERT INTO hbm_bar_bundle_items
               (log_id, section_name, block_name, item_name, status, remark, action_taken, block_remark)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [log.id, item.section_name, item.block_name, item.item_name,
             item.status, item.remark || null, item.action_taken || null, item.block_remark || null]
          );
        }
      });

      res.status(201).json({ success: true, message: 'Bar Bundle log submitted successfully', data: log });

      sendBarBundleNotification({
        date: log_date,
        filledBy: req.user.username,
        submittedAt: new Date(),
        items
      }).catch((e) => console.error('Telegram Bar Bundle notify error:', e));
    } catch (error) {
      console.error('Bar Bundle create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Bar Bundle log' });
    }
  }

  // ==========================================
  // BEFORE ROLLING CHECKSHEET LOGS
  // ==========================================

  static async getBeforeRollingLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (date_from) { conditions.push(`l.log_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to)   { conditions.push(`l.log_date <= $${paramIdx++}`); params.push(date_to); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(i.id) as total_items,
          COUNT(i.id) FILTER (WHERE i.status = 'NOT_OK') as not_ok_count
         FROM hbm_before_rolling_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_before_rolling_items i ON i.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Before Rolling get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Before Rolling logs' });
    }
  }

  static async getBeforeRollingLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_before_rolling_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );

      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Before Rolling log not found' });

      const itemsResult = await query(
        `SELECT * FROM hbm_before_rolling_items WHERE log_id = $1
         ORDER BY section_name, block_name, item_name`,
        [id]
      );

      res.json({ success: true, data: { ...logResult.rows[0], items: itemsResult.rows } });
    } catch (error) {
      console.error('Before Rolling get log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Before Rolling log' });
    }
  }

  static async createBeforeRollingLog(req, res) {
    try {
      const {
        log_date, checked_by, mill_shift_incharge, mechanical_engineer,
        sec1_result, sec2_result, sec3_result, sec4_result,
        items
      } = req.body;

      if (!log_date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one check item is required' });
      }

      for (const item of items) {
        if (item.status === 'NOT_OK') {
          if (!item.remark || item.remark.trim() === '')
            return res.status(400).json({ success: false, message: `Remark is compulsory for NOT OK item: ${item.item_name}` });
          if (!item.action_taken || item.action_taken.trim() === '')
            return res.status(400).json({ success: false, message: `Action Taken is compulsory for NOT OK item: ${item.item_name}` });
        }
      }

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_before_rolling_logs
             (log_date, checked_by, mill_shift_incharge, mechanical_engineer,
              sec1_result, sec2_result, sec3_result, sec4_result, filled_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
          [
            log_date,
            checked_by          || null,
            mill_shift_incharge || null,
            mechanical_engineer || null,
            sec1_result || null, sec2_result || null, sec3_result || null, sec4_result || null,
            req.user.id
          ]
        );

        log = logResult.rows[0];

        for (const item of items) {
          await client.query(
            `INSERT INTO hbm_before_rolling_items
               (log_id, section_name, block_name, item_name, item_value, status, remark, action_taken, block_remark)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [log.id, item.section_name, item.block_name, item.item_name,
             item.item_value || null, item.status, item.remark || null,
             item.action_taken || null, item.block_remark || null]
          );
        }
      });

      res.status(201).json({ success: true, message: 'Before Rolling log submitted successfully', data: log });

      sendBeforeRollingNotification({
        date: log_date,
        filledBy: req.user.username,
        submittedAt: new Date(),
        checkedBy: checked_by,
        millShiftIncharge: mill_shift_incharge,
        mechEngineer: mechanical_engineer,
        items
      }).catch((e) => console.error('Telegram Before Rolling notify error:', e));
    } catch (error) {
      console.error('Before Rolling create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Before Rolling log' });
    }
  }

  // ==========================================
  // PUMP PARAMETER REPORT LOGS
  // ==========================================

  static async getPumpParamLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (date_from) { conditions.push(`l.log_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to)   { conditions.push(`l.log_date <= $${paramIdx++}`); params.push(date_to); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(e.id) as total_entries,
          COUNT(e.id) FILTER (WHERE e.kw IS NOT NULL OR e.amp IS NOT NULL) as filled_entries
         FROM hbm_pump_param_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_pump_param_entries e ON e.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Pump Param get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Pump Parameter logs' });
    }
  }

  static async getPumpParamLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_pump_param_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );

      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Pump Parameter log not found' });

      const entriesResult = await query(
        `SELECT * FROM hbm_pump_param_entries WHERE log_id = $1 ORDER BY id`,
        [id]
      );

      const sec2Result = await query(
        `SELECT * FROM hbm_pump_param_sec2 WHERE log_id = $1 ORDER BY id`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...logResult.rows[0],
          entries: entriesResult.rows,
          sec2_items: sec2Result.rows,
        }
      });
    } catch (error) {
      console.error('Pump Param get log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Pump Parameter log' });
    }
  }

  static async createPumpParamLog(req, res) {
    try {
      const { log_date, size_value, entries, sec2_items } = req.body;

      if (!log_date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
      }

      if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one pump entry is required' });
      }

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_pump_param_logs (log_date, size_value, filled_by)
           VALUES ($1, $2, $3) RETURNING *`,
          [log_date, size_value || null, req.user.id]
        );

        log = logResult.rows[0];

        for (const entry of entries) {
          await client.query(
            `INSERT INTO hbm_pump_param_entries
               (log_id, pump_name, drive_details, status, kw, amp, rpm, pressure, load_pct, kwh_diff)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              log.id,
              entry.pump_name,
              entry.drive_details || null,
              entry.status || null,
              entry.kw != null && entry.kw !== '' ? entry.kw : null,
              entry.amp != null && entry.amp !== '' ? entry.amp : null,
              entry.rpm != null && entry.rpm !== '' ? entry.rpm : null,
              entry.pressure != null && entry.pressure !== '' ? entry.pressure : null,
              entry.load_pct != null && entry.load_pct !== '' ? entry.load_pct : null,
              entry.kwh_diff != null && entry.kwh_diff !== '' ? entry.kwh_diff : null,
            ]
          );
        }

        if (sec2_items && Array.isArray(sec2_items)) {
          for (const item of sec2_items) {
            await client.query(
              `INSERT INTO hbm_pump_param_sec2 (log_id, item_name, value_text, item_status)
               VALUES ($1,$2,$3,$4)`,
              [log.id, item.item_name, item.value_text || null, item.item_status || null]
            );
          }
        }
      });

      res.status(201).json({ success: true, message: 'Pump Parameter report submitted successfully', data: log });

      sendPumpParamNotification({
        date: log_date,
        sizeValue: size_value,
        entries,
        sec2Items: sec2_items || [],
        filledBy: req.user.username,
        submittedAt: new Date(),
      }).catch((e) => console.error('Telegram Pump Param notify error:', e));
    } catch (error) {
      console.error('Pump Param create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Pump Parameter report' });
    }
  }

  // ==========================================
  // VISUAL INSPECTION & HBM TRANSFORMER
  // ==========================================

  static async getTransformerLogs(req, res) {
    try {
      const { date_from, date_to, limit = 50 } = req.query;
      const conditions = [];
      const params = [];
      if (date_from) { params.push(date_from); conditions.push(`l.log_date >= $${params.length}`); }
      if (date_to)   { params.push(date_to);   conditions.push(`l.log_date <= $${params.length}`); }
      params.push(parseInt(limit) || 50);
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_transformer_logs l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Transformer get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Transformer logs' });
    }
  }

  static async getTransformerLogById(req, res) {
    try {
      const { id } = req.params;
      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_transformer_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Transformer log not found' });

      const [s1, s2, s3] = await Promise.all([
        query(`SELECT * FROM hbm_transformer_sec1 WHERE log_id = $1 ORDER BY id`, [id]),
        query(`SELECT * FROM hbm_transformer_sec2 WHERE log_id = $1 ORDER BY id`, [id]),
        query(`SELECT * FROM hbm_transformer_sec3 WHERE log_id = $1 ORDER BY id`, [id]),
      ]);
      res.json({ ...logResult.rows[0], sec1: s1.rows, sec2: s2.rows, sec3: s3.rows });
    } catch (error) {
      console.error('Transformer get by id error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Transformer log' });
    }
  }

  static async createTransformerLog(req, res) {
    try {
      const { log_date, sec1, sec2, sec3, sec2_remark, sec3_remark } = req.body;
      if (!log_date) return res.status(400).json({ success: false, message: 'Date is required' });

      const n = (v) => (v !== '' && v != null ? parseFloat(v) : null);
      const s = (v) => (v && String(v).trim() ? String(v).trim() : null);

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_transformer_logs (log_date, sec2_remark, sec3_remark, filled_by)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [log_date, s(sec2_remark), s(sec3_remark), req.user.id]
        );
        log = logResult.rows[0];

        for (const u of (sec1 || [])) {
          await client.query(
            `INSERT INTO hbm_transformer_sec1
               (log_id,unit_name,rated_current,ct_ratio,bar_size,ht_current,ht_volt,
                tap_count_diff,tap_position,wind_temperature,oil_temperature,
                main_tank_oil_level,oltc_oil_level,silica_gel_color,
                cleaning,electric_inspection,mech_inspection,relay_condition,
                meter_condition,indicator,announce_meter,oil_leakage,tnc_operation,dc_supply)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
            [
              log.id, u.unit_name,
              n(u.rated_current), s(u.ct_ratio), s(u.bar_size),
              n(u.ht_current), n(u.ht_volt),
              n(u.tap_count_diff), n(u.tap_position),
              n(u.wind_temperature), n(u.oil_temperature),
              n(u.main_tank_oil_level), n(u.oltc_oil_level),
              s(u.silica_gel_color),
              s(u.cleaning), s(u.electric_inspection), s(u.mech_inspection),
              s(u.relay_condition), s(u.meter_condition), s(u.indicator),
              s(u.announce_meter), s(u.oil_leakage), s(u.tnc_operation), s(u.dc_supply),
            ]
          );
        }

        for (const u of (sec2 || [])) {
          await client.query(
            `INSERT INTO hbm_transformer_sec2
               (log_id, unit_name, today_tap_count, yesterday_tap_count, difference)
             VALUES ($1,$2,$3,$4,$5)`,
            [log.id, u.unit_name, n(u.today_tap_count), n(u.yesterday_tap_count), n(u.difference)]
          );
        }

        for (const u of (sec3 || [])) {
          await client.query(
            `INSERT INTO hbm_transformer_sec3
               (log_id, unit_name, today_kwh, yesterday_kwh, diff_kwh, today_kvah, yesterday_kvah, diff_kvah)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [log.id, u.unit_name, n(u.today_kwh), n(u.yesterday_kwh), n(u.diff_kwh),
             n(u.today_kvah), n(u.yesterday_kvah), n(u.diff_kvah)]
          );
        }
      });

      res.status(201).json({ success: true, id: log.id });

      sendTransformerNotification({
        date: log_date,
        sec1: sec1 || [],
        sec2: sec2 || [],
        sec3: sec3 || [],
        sec2Remark: sec2_remark,
        sec3Remark: sec3_remark,
        filledBy: req.user.username,
        submittedAt: new Date(),
      }).catch((e) => console.error('Transformer notify error:', e));
    } catch (error) {
      console.error('Transformer create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Transformer log' });
    }
  }

  static async downloadTransformerPDF(req, res) {
    const { id } = req.params;
    try {
      const logResult = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM hbm_transformer_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Transformer log not found' });

      const log = logResult.rows[0];
      const [s1, s2, s3] = await Promise.all([
        query(`SELECT * FROM hbm_transformer_sec1 WHERE log_id = $1 ORDER BY id`, [id]),
        query(`SELECT * FROM hbm_transformer_sec2 WHERE log_id = $1 ORDER BY id`, [id]),
        query(`SELECT * FROM hbm_transformer_sec3 WHERE log_id = $1 ORDER BY id`, [id]),
      ]);

      const margin = 40;
      const pageW  = 515;
      const colX   = margin;
      const v = (val) => (val != null ? String(val) : '—');

      const doc = new PDFDocument({ margin, size: 'A4', bufferPages: true });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `attachment; filename=hbm_transformer_${id}_${log.log_date || 'report'}.pdf`);

      // ── Company Header ──
      if (fs.existsSync(LOGO_PATH)) doc.image(LOGO_PATH, colX, 30, { width: 60, height: 60 });
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000')
        .text('SRJ STRIPS AND PIPES PVT LTD', 110, 35, { width: pageW - 70 });
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e40af')
        .text('HBM CHECKSHEET REPORT', 110, 55, { width: pageW - 70 });
      doc.fillColor('#000000').font('Helvetica').fontSize(10)
        .text('Visual Inspection & HBM Transformer', 110, 72, { width: pageW - 70 });
      doc.moveTo(colX, 97).lineTo(colX + pageW, 97).stroke('#1e40af');
      doc.y = 108;

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
      doc.text(`Date      : ${new Date(log.log_date).toLocaleDateString('en-IN')}`, colX);
      doc.text(`Filled By : ${log.filled_by_name}`, colX);
      doc.text(`Submitted : ${new Date(log.created_at).toLocaleString('en-IN')}`, colX);
      doc.moveDown(0.8);

      // ── Helper: section banner ──
      const sectionBanner = (title) => {
        if (doc.y + 24 > 760) { doc.addPage(); doc.y = margin; }
        doc.rect(colX, doc.y, pageW, 22).fill('#1e40af');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF')
          .text(title, colX + 8, doc.y - 15, { width: pageW - 16 });
        doc.fillColor('#000000');
        doc.y += 10;
      };

      // ── Helper: simple two-column info row ──
      const infoRow = (label, val, y) => {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151')
          .text(label, colX + 4, y, { width: 130 });
        doc.font('Helvetica').fontSize(9).fillColor('#000000')
          .text(val, colX + 138, y, { width: pageW - 142 });
      };

      // ── SECTION 1 ──
      sectionBanner('SECTION 1 — Visual Inspection');
      doc.y += 4;

      const SEC1_LABELS = [
        ['rated_current','Rated Current'],['ct_ratio','CT Ratio'],['bar_size','Bar Size'],
        ['ht_current','HT Current'],['ht_volt','HT Volt'],['tap_count_diff','Tap Count Diff'],
        ['tap_position','Tap Position'],['wind_temperature','Wind Temp (°C)'],
        ['oil_temperature','Oil Temp (°C)'],['main_tank_oil_level','Main Tank Oil Level (%)'],
        ['oltc_oil_level','OLTC Oil Level (%)'],['silica_gel_color','Silica Gel Color'],
        ['cleaning','Cleaning'],['electric_inspection','Electric Inspection'],
        ['mech_inspection','Mech. Inspection'],['relay_condition','Relay Condition'],
        ['meter_condition','Meter Condition'],['indicator','Indicator'],
        ['announce_meter','Announce Meter'],['oil_leakage','Oil Leakage'],
        ['tnc_operation','TNC Operation'],['dc_supply','DC Supply'],
      ];

      for (const unit of s1.rows) {
        if (doc.y + 16 > 750) { doc.addPage(); doc.y = margin; }
        doc.rect(colX, doc.y, pageW, 18).fill('#dbeafe');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e40af')
          .text(unit.unit_name, colX + 6, doc.y - 13, { width: pageW - 12 });
        doc.fillColor('#000000');
        doc.y += 6;

        SEC1_LABELS.forEach(([key, lbl], i) => {
          if (doc.y + 16 > 760) { doc.addPage(); doc.y = margin; }
          if (i % 2 === 0) doc.rect(colX, doc.y, pageW, 16).fill('#f9fafb');
          infoRow(lbl, v(unit[key]), doc.y + 3);
          doc.y += 16;
        });
        doc.y += 6;
      }

      // ── SECTION 2 ──
      if (doc.y + 60 > 760) { doc.addPage(); doc.y = margin; }
      sectionBanner('SECTION 2 — OLTC Daily Report');
      doc.y += 4;

      // Table header
      const s2ColW = [120, 115, 140, 140];
      const drawS2Row = (y, c1, c2, c3, c4, isH) => {
        const total = s2ColW.reduce((a, b) => a + b, 0);
        if (isH) { doc.rect(colX, y, total, 20).fill('#1e40af'); doc.fillColor('#FFFFFF'); }
        else { doc.fillColor('#000000'); }
        doc.rect(colX, y, total, 20).stroke('#333');
        let cx = colX;
        s2ColW.forEach(w => { doc.moveTo(cx, y).lineTo(cx, y + 20).stroke('#333'); cx += w; });
        const f = isH ? 'Helvetica-Bold' : 'Helvetica';
        doc.font(f).fontSize(9);
        doc.text(c1, colX + 4, y + 6, { width: s2ColW[0] - 8 });
        doc.text(c2, colX + s2ColW[0] + 4, y + 6, { width: s2ColW[1] - 8, align: 'center' });
        doc.text(c3, colX + s2ColW[0] + s2ColW[1] + 4, y + 6, { width: s2ColW[2] - 8, align: 'center' });
        doc.text(c4, colX + s2ColW[0] + s2ColW[1] + s2ColW[2] + 4, y + 6, { width: s2ColW[3] - 8, align: 'center' });
        doc.fillColor('#000000');
      };

      let cy = doc.y;
      drawS2Row(cy, 'Unit', 'Today Tap Count', 'Yesterday Tap Count', 'Difference', true);
      cy += 20;
      for (const u of s2.rows) {
        drawS2Row(cy, u.unit_name, v(u.today_tap_count), v(u.yesterday_tap_count), v(u.difference), false);
        cy += 20;
      }
      doc.y = cy + 6;
      if (log.sec2_remark) {
        doc.font('Helvetica-Bold').fontSize(9).text('Remark: ', colX, doc.y, { continued: true });
        doc.font('Helvetica').text(log.sec2_remark);
      }
      doc.y += 10;

      // ── SECTION 3 ──
      if (doc.y + 80 > 760) { doc.addPage(); doc.y = margin; }
      sectionBanner('SECTION 3 — KWH & KVAH Daily Report');
      doc.y += 4;

      const s3ColW = [80, 70, 75, 75, 70, 75, 75];
      const drawS3Row = (y, cols, isH) => {
        const total = s3ColW.reduce((a, b) => a + b, 0);
        if (isH) { doc.rect(colX, y, total, 24).fill('#1e40af'); doc.fillColor('#FFFFFF'); }
        else { doc.fillColor('#000000'); }
        doc.rect(colX, y, total, 24).stroke('#333');
        let cx = colX;
        s3ColW.forEach(w => { doc.moveTo(cx, y).lineTo(cx, y + 24).stroke('#333'); cx += w; });
        const f = isH ? 'Helvetica-Bold' : 'Helvetica';
        doc.font(f).fontSize(8);
        let xPos = colX;
        cols.forEach((c, i) => {
          doc.text(c, xPos + 3, y + 7, { width: s3ColW[i] - 6, align: 'center' });
          xPos += s3ColW[i];
        });
        doc.fillColor('#000000');
      };

      cy = doc.y;
      drawS3Row(cy, ['Unit','KWH Today','KWH Yesterday','KWH Diff','KVAH Today','KVAH Yesterday','KVAH Diff'], true);
      cy += 24;
      for (const u of s3.rows) {
        drawS3Row(cy, [u.unit_name, v(u.today_kwh), v(u.yesterday_kwh), v(u.diff_kwh), v(u.today_kvah), v(u.yesterday_kvah), v(u.diff_kvah)], false);
        cy += 24;
      }
      doc.y = cy + 6;
      if (log.sec3_remark) {
        doc.font('Helvetica-Bold').fontSize(9).text('Remark: ', colX, doc.y, { continued: true });
        doc.font('Helvetica').text(log.sec3_remark);
      }

      // ── Page Footers ──
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.font('Helvetica').fontSize(8).fillColor('#888888')
          .text(`Generated: ${new Date().toLocaleString('en-IN')}   |   Page ${i + 1} of ${range.count}`,
            colX, 820, { width: pageW, align: 'center' });
      }

      doc.on('end', () => res.send(Buffer.concat(buffers)));
      doc.end();
    } catch (error) {
      console.error('Transformer PDF error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }

  // ==========================================
  // PUMP HOUSE MAINTENANCE WORK SHEET
  // ==========================================

  static async getPhMaintLogs(req, res) {
    try {
      const { date_from, date_to, limit = 50 } = req.query;
      const conditions = [];
      const params = [];

      if (date_from) { params.push(date_from); conditions.push(`l.log_date >= $${params.length}`); }
      if (date_to)   { params.push(date_to);   conditions.push(`l.log_date <= $${params.length}`); }

      params.push(parseInt(limit) || 50);
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(i.id) as total_items
         FROM hbm_ph_maint_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_ph_maint_items i ON i.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      res.json(result.rows);
    } catch (error) {
      console.error('PH Maint get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Pump House Maintenance logs' });
    }
  }

  static async getPhMaintLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_ph_maint_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Pump House Maintenance log not found' });

      const itemsResult = await query(
        `SELECT * FROM hbm_ph_maint_items WHERE log_id = $1 ORDER BY item_no`,
        [id]
      );

      res.json({ ...logResult.rows[0], items: itemsResult.rows });
    } catch (error) {
      console.error('PH Maint get by id error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Pump House Maintenance log' });
    }
  }

  static async createPhMaintLog(req, res) {
    try {
      const { log_date, items } = req.body;
      if (!log_date) return res.status(400).json({ success: false, message: 'Date is required' });

      const validItems = (items || []).filter(i => i.item_text && i.item_text.trim());
      if (validItems.length === 0)
        return res.status(400).json({ success: false, message: 'At least one maintenance work item is required' });

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_ph_maint_logs (log_date, filled_by)
           VALUES ($1, $2) RETURNING *`,
          [log_date, req.user.id]
        );
        log = logResult.rows[0];

        for (let idx = 0; idx < validItems.length; idx++) {
          await client.query(
            `INSERT INTO hbm_ph_maint_items (log_id, item_no, item_text)
             VALUES ($1, $2, $3)`,
            [log.id, idx + 1, validItems[idx].item_text.trim()]
          );
        }
      });

      res.status(201).json({ success: true, id: log.id });

      sendPhMaintNotification({
        date: log_date,
        items: validItems.map(i => i.item_text),
        filledBy: req.user.username,
        submittedAt: new Date(),
      }).catch((e) => console.error('PH Maint notify error:', e));
    } catch (error) {
      console.error('PH Maint create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Pump House Maintenance log' });
    }
  }

  // ==========================================
  // PUMP HOUSE MAINTENANCE PDF DOWNLOAD
  // ==========================================

  static async downloadPhMaintPDF(req, res) {
    const { id } = req.params;
    try {
      const logResult = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM hbm_ph_maint_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Maintenance log not found' });

      const log = logResult.rows[0];

      const itemsResult = await query(
        `SELECT * FROM hbm_ph_maint_items WHERE log_id = $1 ORDER BY item_no`,
        [id]
      );
      const items = itemsResult.rows;

      const margin = 40;
      const pageW  = 515;
      const colX   = margin;

      const doc = new PDFDocument({ margin, size: 'A4', bufferPages: true });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `attachment; filename=hbm_ph_maint_${id}_${log.log_date || 'report'}.pdf`);

      // ── Company Header ──
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, colX, 30, { width: 60, height: 60 });
      }
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000')
        .text('SRJ STRIPS AND PIPES PVT LTD', 110, 35, { width: pageW - 70 });
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e40af')
        .text('HBM CHECKSHEET REPORT', 110, 55, { width: pageW - 70 });
      doc.fillColor('#000000').font('Helvetica').fontSize(10)
        .text('Pump House Maintenance Work Sheet', 110, 72, { width: pageW - 70 });
      doc.moveTo(colX, 97).lineTo(colX + pageW, 97).stroke('#1e40af');
      doc.y = 108;

      // ── Log Info ──
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
      doc.text(`Date        : ${new Date(log.log_date).toLocaleDateString('en-IN')}`, colX);
      doc.text(`Filled By   : ${log.filled_by_name}`, colX);
      doc.text(`Submitted   : ${new Date(log.created_at).toLocaleString('en-IN')}`, colX);
      doc.moveDown(1);

      // ── Section Header ──
      doc.rect(colX, doc.y, pageW, 22).fill('#1e40af');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF')
        .text('Maintenance Work', colX + 8, doc.y - 16, { width: pageW - 16 });
      doc.fillColor('#000000');
      doc.y += 8;

      // ── Work Items ──
      items.forEach((item) => {
        if (doc.y + 24 > 760) { doc.addPage(); doc.y = margin; }
        doc.rect(colX, doc.y, pageW, 1).fill('#e5e7eb');
        doc.y += 6;
        doc.font('Helvetica-Bold').fontSize(10)
          .text(`${item.item_no}.`, colX + 4, doc.y, { width: 20, continued: true });
        doc.font('Helvetica').fontSize(10)
          .text(`  ${item.item_text}`, { width: pageW - 30 });
        doc.y += 6;
      });

      // ── Page Footers ──
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.font('Helvetica').fontSize(8).fillColor('#888888')
          .text(
            `Generated: ${new Date().toLocaleString('en-IN')}   |   Page ${i + 1} of ${range.count}`,
            colX, 820, { width: pageW, align: 'center' }
          );
      }

      doc.on('end', () => res.send(Buffer.concat(buffers)));
      doc.end();

    } catch (error) {
      console.error('PH Maint PDF download error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }

  // ==========================================
  // PUMP HOUSE WATER PARAMETERS
  // ==========================================

  static async getWaterParamLogs(req, res) {
    try {
      const { date_from, date_to, limit = 50 } = req.query;
      const conditions = [];
      const params = [];

      if (date_from) { params.push(date_from); conditions.push(`l.log_date >= $${params.length}`); }
      if (date_to)   { params.push(date_to);   conditions.push(`l.log_date <= $${params.length}`); }

      params.push(parseInt(limit) || 50);
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(e.id) as total_entries
         FROM hbm_water_param_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_water_param_entries e ON e.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Water Param get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Water Parameter logs' });
    }
  }

  static async getWaterParamLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_water_param_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Water Parameter log not found' });

      const entriesResult = await query(
        `SELECT * FROM hbm_water_param_entries WHERE log_id = $1 ORDER BY id`,
        [id]
      );

      res.json({ ...logResult.rows[0], entries: entriesResult.rows });
    } catch (error) {
      console.error('Water Param get by id error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Water Parameter log' });
    }
  }

  static async createWaterParamLog(req, res) {
    try {
      const { log_date, remark, entries } = req.body;
      if (!log_date) return res.status(400).json({ success: false, message: 'Date is required' });
      if (!entries || !Array.isArray(entries) || entries.length === 0)
        return res.status(400).json({ success: false, message: 'At least one water source entry is required' });

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_water_param_logs (log_date, remark, filled_by)
           VALUES ($1, $2, $3) RETURNING *`,
          [log_date, remark || null, req.user.id]
        );
        log = logResult.rows[0];

        for (const entry of entries) {
          await client.query(
            `INSERT INTO hbm_water_param_entries
               (log_id, water_source, source_status, tds, tds_status, hardness, hardness_status, ph, ph_status, temperature, temp_status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [
              log.id,
              entry.water_source,
              entry.source_status || null,
              entry.tds != null && entry.tds !== '' ? entry.tds : null,
              entry.tds_status || null,
              entry.hardness != null && entry.hardness !== '' ? entry.hardness : null,
              entry.hardness_status || null,
              entry.ph != null && entry.ph !== '' ? entry.ph : null,
              entry.ph_status || null,
              entry.temperature != null && entry.temperature !== '' ? entry.temperature : null,
              entry.temp_status || null,
            ]
          );
        }
      });

      res.status(201).json({ success: true, id: log.id });

      sendWaterParamNotification({
        date: log_date,
        remark,
        entries,
        filledBy: req.user.username,
        submittedAt: new Date(),
      }).catch((e) => console.error('Water Param notify error:', e));
    } catch (error) {
      console.error('Water Param create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Water Parameter report' });
    }
  }

  // ==========================================
  // WATER PARAM PDF DOWNLOAD
  // ==========================================

  static async downloadWaterParamPDF(req, res) {
    const { id } = req.params;
    try {
      const logResult = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM hbm_water_param_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Water Parameter log not found' });

      const log = logResult.rows[0];

      const entriesResult = await query(
        `SELECT * FROM hbm_water_param_entries WHERE log_id = $1 ORDER BY id`,
        [id]
      );
      const entries = entriesResult.rows;

      // PDF layout constants
      const margin  = 40;
      const pageW   = 515;
      const colX    = margin;

      // Column widths: Source | Status | TDS | Hardness | PH | Temp
      const c0 = 110; // Water Source
      const c1 = 45;  // Status
      const c2 = 75;  // TDS
      const c3 = 80;  // Hardness
      const c4 = 65;  // PH
      const c5 = pageW - c0 - c1 - c2 - c3 - c4; // Temperature
      const rowH = 36;

      const doc = new PDFDocument({ margin, size: 'A4', bufferPages: true });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `attachment; filename=hbm_water_param_${id}_${log.log_date || 'report'}.pdf`);

      // ── Company Header ──
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, colX, 30, { width: 60, height: 60 });
      }
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000')
        .text('SRJ STRIPS AND PIPES PVT LTD', 110, 35, { width: pageW - 70 });
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e40af')
        .text('HBM CHECKSHEET REPORT', 110, 55, { width: pageW - 70 });
      doc.fillColor('#000000').font('Helvetica').fontSize(10)
        .text('Pump House Water Parameters', 110, 72, { width: pageW - 70 });
      doc.moveTo(colX, 97).lineTo(colX + pageW, 97).stroke('#1e40af');
      doc.y = 108;

      // ── Log Info ──
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
      doc.text(`Date        : ${new Date(log.log_date).toLocaleDateString('en-IN')}`, colX);
      doc.text(`Filled By   : ${log.filled_by_name}`, colX);
      doc.text(`Submitted   : ${new Date(log.created_at).toLocaleString('en-IN')}`, colX);
      if (log.remark) {
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(9).text('Remark: ', colX, doc.y, { continued: true });
        doc.font('Helvetica').text(log.remark);
      }
      doc.moveDown(1);

      // ── Table header helper ──
      const drawWaterRow = (y, src, status, tds, tdsSt, hard, hardSt, ph, phSt, temp, tempSt, isHeader) => {
        const totalW = c0 + c1 + c2 + c3 + c4 + c5;

        if (isHeader) {
          doc.rect(colX, y, totalW, rowH).fill('#1e40af');
          doc.fillColor('#FFFFFF');
        } else {
          const hasNotOk = [tdsSt, hardSt, phSt, tempSt].includes('NOT_OK');
          if (status === 'OFF') {
            doc.rect(colX, y, totalW, rowH).fill('#F3F4F6');
          } else if (hasNotOk) {
            doc.rect(colX, y, totalW, rowH).fill('#FEE2E2');
          }
          doc.fillColor('#000000');
        }

        doc.rect(colX, y, totalW, rowH).stroke('#333333');

        // column dividers
        let cx = colX + c0;
        [c1, c2, c3, c4].forEach(w => {
          doc.moveTo(cx, y).lineTo(cx, y + rowH).stroke('#333333');
          cx += w;
        });

        const ty = y + 5;
        const fs = isHeader ? 9 : 8;
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs);

        doc.text(src  || '—', colX + 3,             ty, { width: c0 - 6 });
        doc.text(status || '—', colX + c0 + 2,      ty, { width: c1 - 4, align: 'center' });

        if (!isHeader) {
          // TDS cell: value + status
          const tdsText = tds != null ? String(tds) : (status === 'OFF' ? 'OFF' : '—');
          const tdsStText = tdsSt || '';
          doc.font('Helvetica-Bold').fontSize(8)
            .text(tdsText, colX + c0 + c1 + 2, ty, { width: c2 - 4, align: 'center' });
          if (tdsStText) {
            doc.font('Helvetica').fontSize(7)
              .fillColor(tdsStText === 'OK' ? '#15803d' : '#b91c1c')
              .text(tdsStText, colX + c0 + c1 + 2, ty + 10, { width: c2 - 4, align: 'center' });
            doc.fillColor('#000000');
          }

          // Hardness cell
          const hardText = hard != null ? String(hard) : (status === 'OFF' ? 'OFF' : '—');
          const hardStText = hardSt || '';
          doc.font('Helvetica-Bold').fontSize(8)
            .text(hardText, colX + c0 + c1 + c2 + 2, ty, { width: c3 - 4, align: 'center' });
          if (hardStText) {
            doc.font('Helvetica').fontSize(7)
              .fillColor(hardStText === 'OK' ? '#15803d' : '#b91c1c')
              .text(hardStText, colX + c0 + c1 + c2 + 2, ty + 10, { width: c3 - 4, align: 'center' });
            doc.fillColor('#000000');
          }

          // PH cell
          const phText = ph != null ? String(ph) : (status === 'OFF' ? 'OFF' : '—');
          const phStText = phSt || '';
          doc.font('Helvetica-Bold').fontSize(8)
            .text(phText, colX + c0 + c1 + c2 + c3 + 2, ty, { width: c4 - 4, align: 'center' });
          if (phStText) {
            doc.font('Helvetica').fontSize(7)
              .fillColor(phStText === 'OK' ? '#15803d' : '#b91c1c')
              .text(phStText, colX + c0 + c1 + c2 + c3 + 2, ty + 10, { width: c4 - 4, align: 'center' });
            doc.fillColor('#000000');
          }

          // Temp cell
          const tempText = temp != null ? String(temp) : (status === 'OFF' ? 'OFF' : '—');
          const tempStText = tempSt || '';
          doc.font('Helvetica-Bold').fontSize(8)
            .text(tempText, colX + c0 + c1 + c2 + c3 + c4 + 2, ty, { width: c5 - 4, align: 'center' });
          if (tempStText) {
            doc.font('Helvetica').fontSize(7)
              .fillColor(tempStText === 'OK' ? '#15803d' : '#b91c1c')
              .text(tempStText, colX + c0 + c1 + c2 + c3 + c4 + 2, ty + 10, { width: c5 - 4, align: 'center' });
            doc.fillColor('#000000');
          }
        } else {
          // header row — simple text for each column
          doc.font('Helvetica-Bold').fontSize(9);
          doc.text(tds,  colX + c0 + c1 + 2,               ty, { width: c2 - 4, align: 'center' });
          doc.text(hard, colX + c0 + c1 + c2 + 2,          ty, { width: c3 - 4, align: 'center' });
          doc.text(ph,   colX + c0 + c1 + c2 + c3 + 2,     ty, { width: c4 - 4, align: 'center' });
          doc.text(temp, colX + c0 + c1 + c2 + c3 + c4 + 2, ty, { width: c5 - 4, align: 'center' });
        }

        doc.fillColor('#000000');
      };

      // Draw table header
      let curY = doc.y;
      drawWaterRow(curY,
        'Water Source', 'Status',
        'TDS (ppm)', null, 'Hardness (ppm)', null,
        'PH', null, 'Temp (°C)', null, true);
      curY += rowH;

      for (const e of entries) {
        if (curY + rowH > 760) {
          doc.addPage();
          curY = margin;
          drawWaterRow(curY,
            'Water Source', 'Status',
            'TDS (ppm)', null, 'Hardness (ppm)', null,
            'PH', null, 'Temp (°C)', null, true);
          curY += rowH;
        }
        drawWaterRow(curY,
          e.water_source, e.source_status,
          e.tds, e.tds_status,
          e.hardness, e.hardness_status,
          e.ph, e.ph_status,
          e.temperature, e.temp_status,
          false);
        curY += rowH;
      }

      doc.y = curY + 10;

      // ── Page Footers ──
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.font('Helvetica').fontSize(8).fillColor('#888888')
          .text(
            `Generated: ${new Date().toLocaleString('en-IN')}   |   Page ${i + 1} of ${range.count}`,
            colX, 820, { width: pageW, align: 'center' }
          );
      }

      doc.on('end', () => res.send(Buffer.concat(buffers)));
      doc.end();

    } catch (error) {
      console.error('Water Param PDF download error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }

  // ==========================================
  // PDF DOWNLOAD
  // ==========================================

  static async downloadHbmPDF(req, res) {
    const { type, id } = req.params;

    const typeMap = {
      'dc-motor':      { logTable: 'hbm_dc_motor_logs',      itemTable: 'hbm_dc_motor_items',      title: 'DC Motor Maintenance Checksheet'        },
      'cooling-bed':   { logTable: 'hbm_cooling_bed_logs',   itemTable: 'hbm_cooling_bed_items',   title: 'Cooling Bed Maintenance Checksheet'     },
      'mill-mech':     { logTable: 'hbm_mill_mech_logs',     itemTable: 'hbm_mill_mech_items',     title: 'Mill Mechanical Maintenance Checksheet' },
      'rolling-stand': { logTable: 'hbm_rolling_stand_logs', itemTable: 'hbm_rolling_stand_items', title: 'Rolling Stand Maintenance Checksheet'   },
      'pumphouse':     { logTable: 'hbm_pumphouse_logs',     itemTable: 'hbm_pumphouse_items',     title: 'Pumphouse Maintenance Checksheet'       },
      'bar-bundle':    { logTable: 'hbm_bar_bundle_logs',    itemTable: 'hbm_bar_bundle_items',    title: 'Bar Bundle Area Checksheet'             },
      'before-rolling':{ logTable: 'hbm_before_rolling_logs', itemTable: 'hbm_before_rolling_items', title: 'HBM Before Rolling Checksheet'         },
    };

    const meta = typeMap[type];
    if (!meta) return res.status(400).json({ success: false, message: 'Invalid checksheet type' });

    try {
      // Fetch log header
      const logResult = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM ${meta.logTable} l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Log not found' });

      const log = logResult.rows[0];

      // Fetch items
      const itemsResult = await query(
        `SELECT * FROM ${meta.itemTable} WHERE log_id = $1
         ORDER BY section_name, block_name, item_name`,
        [id]
      );
      const items = itemsResult.rows;

      // Group items: block_name → section_name → [items]
      const grouped = {};
      items.forEach(item => {
        const block   = item.block_name   || item.section_name || 'General';
        const section = item.section_name || block;
        if (!grouped[block]) grouped[block] = {};
        if (!grouped[block][section]) grouped[block][section] = [];
        grouped[block][section].push(item);
      });

      // PDF layout constants
      const pageWidth = 515;
      const colX      = 40;
      const col1W     = 210;  // Item Name
      const col2W     = 80;   // Status
      const col3W     = 130;  // Remarks
      const col4W     = pageWidth - col1W - col2W - col3W; // Action Taken ≈ 95
      const rowH      = 22;

      const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `attachment; filename=hbm_${type}_${id}_${log.log_date || 'report'}.pdf`);

      // ── Company Header ──
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, colX, 30, { width: 60, height: 60 });
      }
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000')
        .text('SRJ STRIPS AND PIPES PVT LTD', 110, 35, { width: pageWidth - 70 });
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e40af')
        .text('HBM CHECKSHEET REPORT', 110, 55, { width: pageWidth - 70 });
      doc.fillColor('#000000').font('Helvetica').fontSize(10)
        .text(meta.title, 110, 72, { width: pageWidth - 70 });
      doc.moveTo(colX, 97).lineTo(colX + pageWidth, 97).stroke('#1e40af');
      doc.y = 108;

      // ── Log Info ──
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
      if (log.log_date)    doc.text(`Date        : ${new Date(log.log_date).toLocaleDateString('en-IN')}`, colX);
      if (log.log_time)    doc.text(`Time        : ${log.log_time}`, colX);
      if (log.shift)       doc.text(`Shift       : ${log.shift}`, colX);
      if (log.checked_by)  doc.text(`Checked By  : ${log.checked_by}`, colX);
      doc.text(`Filled By   : ${log.filled_by_name}`, colX);
      doc.text(`Submitted   : ${new Date(log.created_at).toLocaleString('en-IN')}`, colX);

      const notOkCount = items.filter(i => i.status === 'NOT_OK').length;
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(9)
        .text(`Total Items: ${items.length}    OK: ${items.length - notOkCount}    NOT OK: ${notOkCount}`, colX);

      if (log.remarks) {
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(9).text('Overall Remarks: ', colX, doc.y, { continued: true });
        doc.font('Helvetica').text(log.remarks);
      }

      doc.moveDown(1);

      // ── Inspection Details Table ──
      let sIdx = 1;
      for (const [block, sections] of Object.entries(grouped)) {
        for (const [section, sectionItems] of Object.entries(sections)) {
          const sectionLabel = block === section ? block : `${block} › ${section}`;

          if (doc.y + rowH * 3 > 760) {
            doc.addPage();
            doc.y = 40;
          }

          doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000')
            .text(`${sIdx}. ${sectionLabel}`, colX);
          doc.moveDown(0.3);
          sIdx++;

          const tableTop = doc.y;
          hbmDrawRow(doc, colX, tableTop, col1W, col2W, col3W, col4W, rowH,
            'Item Name', 'Status', 'Remarks', 'Action Taken', true);

          let curY = tableTop + rowH;
          for (const item of sectionItems) {
            const h = hbmRowHeight(doc,
              [item.item_name, item.status, item.remark, item.action_taken],
              [col1W, col2W, col3W, col4W], 9, 22);

            if (curY + h > 760) {
              doc.addPage();
              curY = 40;
              hbmDrawRow(doc, colX, curY, col1W, col2W, col3W, col4W, rowH,
                'Item Name', 'Status', 'Remarks', 'Action Taken', true);
              curY += rowH;
            }

            hbmDrawRow(doc, colX, curY, col1W, col2W, col3W, col4W, h,
              item.item_name, item.status, item.remark, item.action_taken, false);
            curY += h;
          }

          doc.y = curY + 10;
        }
      }

      // ── Page Footers ──
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.font('Helvetica').fontSize(8).fillColor('#888888')
          .text(
            `Generated: ${new Date().toLocaleString('en-IN')}   |   Page ${i + 1} of ${range.count}`,
            colX, 820, { width: pageWidth, align: 'center' }
          );
      }

      doc.on('end', () => res.send(Buffer.concat(buffers)));
      doc.end();

    } catch (error) {
      console.error('HBM PDF download error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }

  // ==========================================
  // DAILY OIL LEVEL SHEET
  // ==========================================

  static async getOilLevelLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (date_from) { conditions.push(`l.log_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to)   { conditions.push(`l.log_date <= $${paramIdx++}`); params.push(date_to); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(e.id) FILTER (WHERE e.oil_status = 'NOT_OK') as not_ok_count
         FROM hbm_oil_level_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_oil_level_entries e ON e.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Oil Level get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Oil Level logs' });
    }
  }

  static async getOilLevelLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_oil_level_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );

      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Oil Level log not found' });

      const entriesResult = await query(
        `SELECT * FROM hbm_oil_level_entries WHERE log_id = $1 ORDER BY id`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...logResult.rows[0],
          entries: entriesResult.rows,
        }
      });
    } catch (error) {
      console.error('Oil Level get log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Oil Level log' });
    }
  }

  static async createOilLevelLog(req, res) {
    try {
      const { log_date, shift_eng, reading_by, remark, entries } = req.body;

      if (!log_date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
      }

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_oil_level_logs (log_date, shift_eng, reading_by, remark, filled_by)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [log_date, shift_eng || null, reading_by || null, remark || null, req.user.id]
        );

        log = logResult.rows[0];

        if (entries && Array.isArray(entries)) {
          for (const entry of entries) {
            await client.query(
              `INSERT INTO hbm_oil_level_entries
                 (log_id, tank_name, oil_level, oil_status, pressure, temperature)
               VALUES ($1,$2,$3,$4,$5,$6)`,
              [
                log.id,
                entry.tank_name,
                entry.oil_level   != null && entry.oil_level   !== '' ? entry.oil_level   : null,
                entry.oil_status  || null,
                entry.pressure    != null && entry.pressure    !== '' ? entry.pressure    : null,
                entry.temperature != null && entry.temperature !== '' ? entry.temperature : null,
              ]
            );
          }
        }
      });

      res.status(201).json({ success: true, message: 'Daily Oil Level Sheet submitted successfully', data: log });

      sendOilLevelNotification({
        date: log_date,
        shiftEng: shift_eng,
        readingBy: reading_by,
        remark,
        entries: entries || [],
        filledBy: req.user.username,
        submittedAt: new Date(),
      }).catch((e) => console.error('Telegram Oil Level notify error:', e));
    } catch (error) {
      console.error('Oil Level create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Daily Oil Level Sheet' });
    }
  }

  // ==========================================
  // DC MOTOR AIRFLOW, TEMPERATURE & VIBRATION
  // ==========================================

  static async getDcMotorAirflowLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (date_from) { conditions.push(`l.log_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to)   { conditions.push(`l.log_date <= $${paramIdx++}`); params.push(date_to); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.*, u.username as filled_by_name,
          COUNT(e.id) FILTER (WHERE e.kpa_status = 'NOT_OK'
            OR e.air_flow_condition = 'NOT_OK'
            OR e.dc_motor_temp_status = 'NOT_OK'
            OR e.de_bearing_temp_status = 'NOT_OK'
            OR e.nde_bearing_temp_status = 'NOT_OK'
            OR e.blower_motor_temp_status = 'NOT_OK'
            OR e.motor_center_vib_status = 'NOT_OK'
            OR e.encoder_side_vib_status = 'NOT_OK'
            OR e.blower_vib_status = 'NOT_OK') as not_ok_count
         FROM hbm_dc_motor_airflow_logs l
         JOIN users u ON l.filled_by = u.id
         LEFT JOIN hbm_dc_motor_airflow_entries e ON e.log_id = l.id
         ${whereClause}
         GROUP BY l.id, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('DC Motor Airflow get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch DC Motor Airflow logs' });
    }
  }

  static async getDcMotorAirflowLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_dc_motor_airflow_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );

      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'DC Motor Airflow log not found' });

      const entriesResult = await query(
        `SELECT * FROM hbm_dc_motor_airflow_entries WHERE log_id = $1 ORDER BY id`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...logResult.rows[0],
          entries: entriesResult.rows,
        }
      });
    } catch (error) {
      console.error('DC Motor Airflow get log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch DC Motor Airflow log' });
    }
  }

  static async createDcMotorAirflowLog(req, res) {
    try {
      const { log_date, shift_eng, reading_by, remark, entries, mill_status } = req.body;

      if (!log_date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
      }

      const millStatus = mill_status === 'OFF' ? 'OFF' : 'ON';
      if (millStatus === 'OFF' && !(remark && remark.trim())) {
        return res.status(400).json({ success: false, message: 'Remark is required when mill is OFF' });
      }

      const n = (v) => (v != null && v !== '' ? v : null);

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_dc_motor_airflow_logs (log_date, shift_eng, reading_by, remark, filled_by, mill_status)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [log_date, n(shift_eng), n(reading_by), n(remark), req.user.id, millStatus]
        );

        log = logResult.rows[0];

        if (millStatus === 'ON' && entries && Array.isArray(entries)) {
          for (const e of entries) {
            await client.query(
              `INSERT INTO hbm_dc_motor_airflow_entries
                 (log_id, stand_name,
                  dc_motor_kw, blower_kw_rating,
                  running_kpa, kpa_status,
                  air_flow_condition,
                  dc_motor_temp, dc_motor_temp_status,
                  de_bearing_temp, de_bearing_temp_status,
                  nde_bearing_temp, nde_bearing_temp_status,
                  blower_motor_temp, blower_motor_temp_status,
                  motor_center_vib, motor_center_vib_status,
                  encoder_side_vib, encoder_side_vib_status,
                  blower_vib, blower_vib_status)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
              [
                log.id,
                e.stand_name,
                n(e.dc_motor_kw),          n(e.blower_kw_rating),
                n(e.running_kpa),          e.kpa_status || null,
                e.air_flow_condition || null,
                n(e.dc_motor_temp),        e.dc_motor_temp_status || null,
                n(e.de_bearing_temp),      e.de_bearing_temp_status || null,
                n(e.nde_bearing_temp),     e.nde_bearing_temp_status || null,
                n(e.blower_motor_temp),    e.blower_motor_temp_status || null,
                n(e.motor_center_vib),     e.motor_center_vib_status || null,
                n(e.encoder_side_vib),     e.encoder_side_vib_status || null,
                n(e.blower_vib),           e.blower_vib_status || null,
              ]
            );
          }
        }
      });

      res.status(201).json({ success: true, message: 'DC Motor Airflow sheet submitted successfully', data: log });

      sendDcMotorAirflowNotification({
        date: log_date,
        shiftEng: shift_eng,
        readingBy: reading_by,
        remark,
        entries: entries || [],
        filledBy: req.user.username,
        submittedAt: new Date(),
      }).catch((err) => console.error('Telegram DC Motor Airflow notify error:', err));
    } catch (error) {
      console.error('DC Motor Airflow create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit DC Motor Airflow sheet' });
    }
  }


  // ── Roughing GB Temp ──────────────────────────────────────────────────────

  static async getRoughingGbTempLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (date_from) { conditions.push(`l.log_date >= $${paramIdx++}`); params.push(date_from); }
      if (date_to)   { conditions.push(`l.log_date <= $${paramIdx++}`); params.push(date_to); }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_roughing_gb_temp_logs l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${paramIdx}`,
        params
      );

      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Roughing GB Temp get logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Roughing GB Temp logs' });
    }
  }

  static async getRoughingGbTempLogById(req, res) {
    try {
      const { id } = req.params;

      const logResult = await query(
        `SELECT l.*, u.username as filled_by_name
         FROM hbm_roughing_gb_temp_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );

      if (logResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Roughing GB Temp log not found' });

      const standsResult = await query(
        `SELECT * FROM hbm_roughing_gb_temp_stands WHERE log_id = $1 ORDER BY id`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...logResult.rows[0],
          stands: standsResult.rows,
        }
      });
    } catch (error) {
      console.error('Roughing GB Temp get log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch Roughing GB Temp log' });
    }
  }

  static async createRoughingGbTempLog(req, res) {
    try {
      const {
        log_date, shift_eng, temp_taken_by,
        s1_flywheel_de, s1_flywheel_nde,
        s1_reduction_de, s1_reduction_nde, s1_reduction_output,
        s1_pinion_de_top, s1_pinion_de_mid, s1_pinion_de_bot,
        s1_pinion_nde_top, s1_pinion_nde_mid, s1_pinion_nde_bot,
        s1_stand_de_top, s1_stand_de_mid, s1_stand_de_bot,
        s1_stand_nde_top, s1_stand_nde_mid, s1_stand_nde_bot,
        sec1_remark, sec2_remark, sec3_remark,
        stands,
      } = req.body;

      if (!log_date) {
        return res.status(400).json({ success: false, message: 'Date is required' });
      }

      const n = (v) => (v != null && v !== '' ? v : null);

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_roughing_gb_temp_logs
             (log_date, shift_eng, temp_taken_by,
              s1_flywheel_de, s1_flywheel_nde,
              s1_reduction_de, s1_reduction_nde, s1_reduction_output,
              s1_pinion_de_top, s1_pinion_de_mid, s1_pinion_de_bot,
              s1_pinion_nde_top, s1_pinion_nde_mid, s1_pinion_nde_bot,
              s1_stand_de_top, s1_stand_de_mid, s1_stand_de_bot,
              s1_stand_nde_top, s1_stand_nde_mid, s1_stand_nde_bot,
              sec1_remark, sec2_remark, sec3_remark,
              filled_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
           RETURNING *`,
          [
            log_date, n(shift_eng), n(temp_taken_by),
            n(s1_flywheel_de), n(s1_flywheel_nde),
            n(s1_reduction_de), n(s1_reduction_nde), n(s1_reduction_output),
            n(s1_pinion_de_top), n(s1_pinion_de_mid), n(s1_pinion_de_bot),
            n(s1_pinion_nde_top), n(s1_pinion_nde_mid), n(s1_pinion_nde_bot),
            n(s1_stand_de_top), n(s1_stand_de_mid), n(s1_stand_de_bot),
            n(s1_stand_nde_top), n(s1_stand_nde_mid), n(s1_stand_nde_bot),
            n(sec1_remark), n(sec2_remark), n(sec3_remark),
            req.user.id,
          ]
        );

        log = logResult.rows[0];

        if (stands && Array.isArray(stands)) {
          for (const s of stands) {
            const hasData = [s.gb_de, s.gb_inter, s.gb_output_top, s.gb_output_bot, s.gb_gearbox,
                             s.s_de_top, s.s_de_bot, s.s_nde_top, s.s_nde_bot].some(x => x != null && x !== '');
            if (!hasData) continue;
            await client.query(
              `INSERT INTO hbm_roughing_gb_temp_stands
                 (log_id, stand_name,
                  gb_de, gb_inter, gb_output_top, gb_output_bot, gb_gearbox,
                  s_de_top, s_de_bot, s_nde_top, s_nde_bot)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
              [
                log.id, s.stand_name,
                n(s.gb_de), n(s.gb_inter), n(s.gb_output_top), n(s.gb_output_bot), n(s.gb_gearbox),
                n(s.s_de_top), n(s.s_de_bot), n(s.s_nde_top), n(s.s_nde_bot),
              ]
            );
          }
        }
      });

      res.status(201).json({ success: true, message: 'Roughing GB Temp sheet submitted successfully', data: log });

      sendRoughingGbTempNotification({
        date: log_date,
        shiftEng: shift_eng,
        tempTakenBy: temp_taken_by,
        s1: {
          flywheel_de: s1_flywheel_de, flywheel_nde: s1_flywheel_nde,
          reduction_de: s1_reduction_de, reduction_nde: s1_reduction_nde, reduction_output: s1_reduction_output,
          pinion_de_top: s1_pinion_de_top, pinion_de_mid: s1_pinion_de_mid, pinion_de_bot: s1_pinion_de_bot,
          pinion_nde_top: s1_pinion_nde_top, pinion_nde_mid: s1_pinion_nde_mid, pinion_nde_bot: s1_pinion_nde_bot,
          stand_de_top: s1_stand_de_top, stand_de_mid: s1_stand_de_mid, stand_de_bot: s1_stand_de_bot,
          stand_nde_top: s1_stand_nde_top, stand_nde_mid: s1_stand_nde_mid, stand_nde_bot: s1_stand_nde_bot,
        },
        stands: stands || [],
        sec1Remark: sec1_remark,
        sec2Remark: sec2_remark,
        sec3Remark: sec3_remark,
        filledBy: req.user.username,
        submittedAt: new Date(),
      }).catch((err) => console.error('Telegram Roughing GB Temp notify error:', err));
    } catch (error) {
      console.error('Roughing GB Temp create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Roughing GB Temp sheet' });
    }
  }

  // ==========================================
  // HBM BREAKDOWN REPORT
  // GET  /api/hbm/breakdown
  // GET  /api/hbm/breakdown/:id
  // POST /api/hbm/breakdown
  // ==========================================
  static async getBreakdownLogs(req, res) {
    try {
      const { date_from, date_to, limit = 20 } = req.query;
      let conditions = [];
      let params = [];
      if (date_from) { params.push(date_from); conditions.push(`l.log_date >= $${params.length}`); }
      if (date_to)   { params.push(date_to);   conditions.push(`l.log_date <= $${params.length}`); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      params.push(parseInt(limit));
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM hbm_breakdown_logs l
         JOIN users u ON l.filled_by = u.id
         ${where}
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Get breakdown logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch breakdown logs' });
    }
  }

  static async getBreakdownLogById(req, res) {
    try {
      const { id } = req.params;
      const logRes = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM hbm_breakdown_logs l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [id]
      );
      if (!logRes.rows.length) return res.status(404).json({ success: false, message: 'Log not found' });
      const log = logRes.rows[0];

      const slotsRes = await query(
        `SELECT * FROM hbm_breakdown_slots WHERE log_id = $1 ORDER BY slot_order`,
        [id]
      );

      const slots = await Promise.all(slotsRes.rows.map(async (slot) => {
        const entriesRes = await query(
          `SELECT * FROM hbm_breakdown_entries WHERE slot_id = $1 ORDER BY id`,
          [slot.id]
        );
        return { ...slot, entries: entriesRes.rows };
      }));

      res.json({ ...log, slots });
    } catch (error) {
      console.error('Get breakdown log by id error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch breakdown log' });
    }
  }

  static async createBreakdownLog(req, res) {
    try {
      const { log_date, size, slots } = req.body;
      if (!log_date || !size) {
        return res.status(400).json({ success: false, message: 'Date and size are required' });
      }

      let log;
      await transaction(async (client) => {
        const logResult = await client.query(
          `INSERT INTO hbm_breakdown_logs (log_date, size, filled_by)
           VALUES ($1, $2, $3) RETURNING *`,
          [log_date, size, req.user.id]
        );
        log = logResult.rows[0];

        if (slots && Array.isArray(slots)) {
          for (const slot of slots) {
            const slotResult = await client.query(
              `INSERT INTO hbm_breakdown_slots (log_id, slot_label, slot_order, miss_roll, miss_roll_18)
               VALUES ($1, $2, $3, $4, $5) RETURNING *`,
              [log.id, slot.slot_label, slot.slot_order,
               slot.miss_roll != null && slot.miss_roll !== '' ? parseInt(slot.miss_roll) : null,
               slot.miss_roll_18 != null && slot.miss_roll_18 !== '' ? parseInt(slot.miss_roll_18) : null]
            );
            const slotId = slotResult.rows[0].id;

            if (slot.entries && Array.isArray(slot.entries)) {
              for (const entry of slot.entries) {
                if (!entry.breakdown_type) continue;
                await client.query(
                  `INSERT INTO hbm_breakdown_entries (slot_id, breakdown_type, breakdown_minutes, breakdown_reason)
                   VALUES ($1, $2, $3, $4)`,
                  [slotId, entry.breakdown_type,
                   entry.breakdown_minutes != null && entry.breakdown_minutes !== '' ? parseInt(entry.breakdown_minutes) : null,
                   entry.breakdown_reason || null]
                );
              }
            }
          }
        }
      });

      res.status(201).json({ success: true, message: 'Breakdown report submitted successfully', data: log });

      sendBreakdownNotification({
        date:        log_date,
        size:        size,
        filledBy:    req.user.username,
        submittedAt: new Date(),
        slots:       slots || [],
      }).catch((err) => console.error('Telegram breakdown notify error:', err));
    } catch (error) {
      console.error('Create breakdown log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit breakdown report' });
    }
  }

  // ==========================================
  // SHEET VIEWER — flat rows for any sheet type
  // GET /api/hbm/sheet-view/:type?date_from=&date_to=
  // ==========================================
  static async getSheetView(req, res) {
    const { type } = req.params;
    const { date_from, date_to } = req.query;

    const buildWhere = (alias = 'l') => {
      const conds = []; const params = [];
      if (date_from) { conds.push(`${alias}.log_date >= $${params.length + 1}`); params.push(date_from); }
      if (date_to)   { conds.push(`${alias}.log_date <= $${params.length + 1}`); params.push(date_to); }
      return { where: conds.length ? 'WHERE ' + conds.join(' AND ') : '', params };
    };

    try {
      // OK/NOT_OK item sheets — expand into one row per item
      const ITEM_SHEETS = {
        'dc-motor':       { log: 'hbm_dc_motor_logs',       items: 'hbm_dc_motor_items',        shift: true },
        'cooling-bed':    { log: 'hbm_cooling_bed_logs',     items: 'hbm_cooling_bed_items',     shift: true },
        'mill-mech':      { log: 'hbm_mill_mech_logs',       items: 'hbm_mill_mech_items',       shift: true },
        'rolling-stand':  { log: 'hbm_rolling_stand_logs',   items: 'hbm_rolling_stand_items',   shift: true },
        'pumphouse':      { log: 'hbm_pumphouse_logs',       items: 'hbm_pumphouse_items',       shift: false },
        'bar-bundle':     { log: 'hbm_bar_bundle_logs',      items: 'hbm_bar_bundle_items',      shift: false },
        'before-rolling': { log: 'hbm_before_rolling_logs',  items: 'hbm_before_rolling_items',  shift: false },
      };

      if (ITEM_SHEETS[type]) {
        const { log: logT, items: itemT, shift } = ITEM_SHEETS[type];
        const { where, params } = buildWhere('l');
        const { rows } = await query(
          `SELECT l.log_date, ${shift ? 'l.shift,' : ''} u.username as filled_by,
                  i.section_name, i.block_name, i.item_name, i.status, i.remark, i.action_taken
           FROM ${logT} l
           JOIN users u ON l.filled_by = u.id
           JOIN ${itemT} i ON i.log_id = l.id
           ${where}
           ORDER BY l.log_date DESC, l.id DESC, i.section_name, i.block_name, i.item_name`,
          params
        );
        return res.json({ success: true, type, columns: ['Date', ...(shift ? ['Shift'] : []), 'Filled By', 'Section', 'Block', 'Item', 'Status', 'Remark', 'Action Taken'], rows });
      }

      if (type === 'oil-level') {
        const { where, params } = buildWhere('l');
        const { rows } = await query(
          `SELECT l.log_date, u.username as filled_by,
                  e.tank_name, e.oil_level, e.pressure, e.temperature, e.oil_status as status
           FROM hbm_oil_level_logs l JOIN users u ON l.filled_by = u.id
           JOIN hbm_oil_level_entries e ON e.log_id = l.id
           ${where} ORDER BY l.log_date DESC, l.id DESC, e.tank_name`, params
        );
        return res.json({ success: true, type, columns: ['Date', 'Filled By', 'Tank Name', 'Oil Level', 'Pressure', 'Temperature', 'Status'], rows });
      }

      if (type === 'dc-motor-airflow') {
        const { where, params } = buildWhere('l');
        const { rows } = await query(
          `SELECT l.log_date, u.username as filled_by,
                  e.stand_name, e.running_kpa, e.kpa_status,
                  e.dc_motor_temp, e.dc_motor_temp_status,
                  e.de_bearing_temp, e.de_bearing_temp_status,
                  e.nde_bearing_temp, e.nde_bearing_temp_status,
                  e.motor_center_vib, e.motor_center_vib_status
           FROM hbm_dc_motor_airflow_logs l JOIN users u ON l.filled_by = u.id
           JOIN hbm_dc_motor_airflow_entries e ON e.log_id = l.id
           ${where} ORDER BY l.log_date DESC, l.id DESC, e.stand_name`, params
        );
        return res.json({ success: true, type, columns: ['Date', 'Filled By', 'Stand', 'KPa', 'KPa Sts', 'Motor °C', 'Mtr Sts', 'DE °C', 'DE Sts', 'NDE °C', 'NDE Sts', 'Ctr Vib', 'Vib Sts'], rows });
      }

      if (type === 'water-param') {
        const { where, params } = buildWhere('l');
        const { rows } = await query(
          `SELECT l.log_date, u.username as filled_by,
                  e.water_source, e.tds, e.hardness, e.ph, e.temperature,
                  e.tds_status, e.hardness_status, e.ph_status, e.temp_status
           FROM hbm_water_param_logs l JOIN users u ON l.filled_by = u.id
           JOIN hbm_water_param_entries e ON e.log_id = l.id
           ${where} ORDER BY l.log_date DESC, l.id DESC, e.water_source`, params
        );
        return res.json({ success: true, type, columns: ['Date', 'Water Source', 'TDS', 'Hardness', 'pH', 'Temperature', 'TDS Sts', 'Hard Sts', 'pH Sts', 'Temp Sts'], rows });
      }

      if (type === 'pump-param') {
        const { where, params } = buildWhere('l');
        const { rows } = await query(
          `SELECT l.log_date, u.username as filled_by,
                  e.pump_name, e.status, e.kw, e.amp, e.rpm, e.pressure, e.load_pct
           FROM hbm_pump_param_logs l JOIN users u ON l.filled_by = u.id
           JOIN hbm_pump_param_entries e ON e.log_id = l.id
           ${where} ORDER BY l.log_date DESC, l.id DESC, e.pump_name`, params
        );
        return res.json({ success: true, type, columns: ['Date', 'Filled By', 'Pump', 'Status', 'KW', 'Amp', 'RPM', 'Pressure', 'Load %'], rows });
      }

      if (type === 'ph-maint') {
        const { where, params } = buildWhere('l');
        const { rows } = await query(
          `SELECT l.log_date, u.username as filled_by, i.item_text as work_description
           FROM hbm_ph_maint_logs l JOIN users u ON l.filled_by = u.id
           JOIN hbm_ph_maint_items i ON i.log_id = l.id
           ${where} ORDER BY l.log_date DESC, l.id DESC, i.id`, params
        );
        return res.json({ success: true, type, columns: ['Date', 'Filled By', 'Work Description'], rows });
      }

      if (type === 'transformer') {
        const { where, params } = buildWhere('l');
        const { rows } = await query(
          `SELECT l.log_date, u.username as filled_by,
                  s.unit_name, s.ht_current, s.ht_volt, s.wind_temperature, s.oil_temperature,
                  s.main_tank_oil_level, s.oltc_oil_level, s.silica_gel_color, s.tap_position,
                  s.cleaning, s.oil_leakage, s.relay_condition
           FROM hbm_transformer_logs l JOIN users u ON l.filled_by = u.id
           JOIN hbm_transformer_sec1 s ON s.log_id = l.id
           ${where} ORDER BY l.log_date DESC, l.id DESC, s.unit_name`, params
        );
        return res.json({ success: true, type, columns: ['Date', 'Unit', 'HT Current', 'HT Volt', 'Wind °C', 'Oil °C', 'Tank Level', 'OLTC Level', 'Silica Gel', 'Tap Pos', 'Clean', 'Leakage', 'Relay'], rows });
      }

      if (type === 'roughing-gb-temp') {
        const { where, params } = buildWhere('l');
        const { rows } = await query(
          `SELECT l.log_date, u.username as filled_by,
                  s.stand_name, s.gb_de, s.gb_inter, s.gb_output_top, s.gb_output_bot, s.gb_gearbox,
                  s.s_de_top, s.s_de_bot, s.s_nde_top, s.s_nde_bot
           FROM hbm_roughing_gb_temp_logs l JOIN users u ON l.filled_by = u.id
           JOIN hbm_roughing_gb_temp_stands s ON s.log_id = l.id
           ${where} ORDER BY l.log_date DESC, l.id DESC, s.stand_name`, params
        );
        return res.json({ success: true, type, columns: ['Date', 'Stand', 'GB DE', 'GB Inter', 'GB Out-T', 'GB Out-B', 'GB Gearbox', 'Std DE-T', 'Std DE-B', 'Std NDE-T', 'Std NDE-B'], rows });
      }

      if (type === 'breakdown') {
        const { where, params } = buildWhere('l');
        const { rows } = await query(
          `SELECT l.log_date, l.size, u.username as filled_by,
                  sl.slot_label, e.breakdown_type, e.breakdown_minutes, e.breakdown_reason
           FROM hbm_breakdown_logs l JOIN users u ON l.filled_by = u.id
           JOIN hbm_breakdown_slots sl ON sl.log_id = l.id
           JOIN hbm_breakdown_entries e ON e.slot_id = sl.id
           ${where} ORDER BY l.log_date DESC, l.id DESC, sl.slot_order`, params
        );
        return res.json({ success: true, type, columns: ['Date', 'Size', 'Slot', 'Breakdown Type', 'Minutes', 'Reason'], rows });
      }

      return res.status(400).json({ success: false, message: `Unknown sheet type: ${type}` });
    } catch (error) {
      console.error('Sheet view error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch sheet data' });
    }
  }

  // ==========================================
  // SEND TODAY'S NOTIFICATIONS
  // POST /api/hbm/send-daily-notifications
  // ==========================================
  static async sendDailyNotifications(req, res) {
    const today = req.body.date || new Date().toISOString().split('T')[0];
    const tg = require('../utils/telegram');

    const results = { sent: [], skipped: [], failed: [] };

    // Helper: fetch today's log for a simple ok/not-ok sheet
    async function sendChecksheet(type, table, items, label, orderBy) {
      try {
        const logRes = await query(
          `SELECT l.*, u.username AS filled_by_name FROM ${table} l
           JOIN users u ON l.filled_by = u.id
           WHERE l.log_date = $1 ORDER BY l.created_at DESC LIMIT 1`,
          [today]
        );
        if (!logRes.rows.length) { results.skipped.push(label); return; }
        const log = logRes.rows[0];
        const itemsRes = await query(`SELECT * FROM ${items} WHERE log_id = $1 ORDER BY ${orderBy}`, [log.id]);
        await tg.sendHbmChecksheetNotification({
          checksheetType: label,
          date: log.log_date, time: log.log_time || null, shift: log.shift || null,
          filledBy: log.filled_by_name, submittedAt: new Date(log.created_at),
          remarks: log.remarks || log.remark || null,
          items: itemsRes.rows.map(r => ({
            section_name: r.section_name || '', block_name: r.block_name || '',
            item_name: r.item_name || '', status: r.status || 'OK',
            remark: r.remark || '', action_taken: r.action_taken || '',
          })),
        });
        results.sent.push(label);
      } catch (e) { console.error(`Daily notif error [${label}]:`, e.message); results.failed.push(label); }
    }

    // DC Motor & Pumphouse — still use generic template
    await sendChecksheet('dc-motor',  'hbm_dc_motor_logs',  'hbm_dc_motor_items',  'DC Motor',   'block_name, section_name, item_name');
    await sendChecksheet('pumphouse', 'hbm_pumphouse_logs', 'hbm_pumphouse_items', 'Pumphouse',  'section_name, item_name');

    // Helper to fetch items for sectioned sheets
    async function sendSectioned(table, itemsTable, label, notifFn, extraFields = {}) {
      try {
        const r = await query(
          `SELECT l.*, u.username AS filled_by_name FROM ${table} l
           JOIN users u ON l.filled_by = u.id WHERE l.log_date = $1 ORDER BY l.created_at DESC LIMIT 1`,
          [today]
        );
        if (!r.rows.length) { results.skipped.push(label); return; }
        const log = r.rows[0];
        const itemsRes = await query(`SELECT * FROM ${itemsTable} WHERE log_id = $1 ORDER BY section_name, block_name, item_name`, [log.id]);
        await notifFn({
          date: log.log_date, time: log.log_time || null, shift: log.shift || null,
          filledBy: log.filled_by_name, submittedAt: new Date(log.created_at),
          remarks: log.remarks || log.remark || null,
          items: itemsRes.rows,
          ...extraFields(log),
        });
        results.sent.push(label);
      } catch (e) { console.error(`Daily notif error [${label}]:`, e.message); results.failed.push(label); }
    }

    await sendSectioned('hbm_cooling_bed_logs',    'hbm_cooling_bed_items',    'Cooling Bed',    tg.sendCoolingBedNotification,    () => ({}));
    await sendSectioned('hbm_mill_mech_logs',      'hbm_mill_mech_items',      'Mill Mechanical', tg.sendMillMechNotification,      () => ({}));
    await sendSectioned('hbm_rolling_stand_logs',  'hbm_rolling_stand_items',  'Rolling Stand',   tg.sendRollingStandNotification,  () => ({}));
    await sendSectioned('hbm_bar_bundle_logs',     'hbm_bar_bundle_items',     'Bar Bundle Area', tg.sendBarBundleNotification,     () => ({}));
    await sendSectioned('hbm_before_rolling_logs', 'hbm_before_rolling_items', 'Before Rolling',  tg.sendBeforeRollingNotification,
      (log) => ({ checkedBy: log.checked_by, millShiftIncharge: log.mill_shift_incharge, mechEngineer: log.mechanical_engineer }));

    // Oil Level
    try {
      const r = await query(`SELECT l.*, u.username AS filled_by_name FROM hbm_oil_level_logs l JOIN users u ON l.filled_by = u.id WHERE l.log_date = $1 ORDER BY l.created_at DESC LIMIT 1`, [today]);
      if (!r.rows.length) { results.skipped.push('Daily Oil Level'); }
      else {
        const log = r.rows[0];
        const entries = await query(`SELECT * FROM hbm_oil_level_entries WHERE log_id = $1 ORDER BY item_name`, [log.id]);
        await tg.sendOilLevelNotification({ date: log.log_date, shift: log.shift, remark: log.remark, entries: entries.rows, filledBy: log.filled_by_name, submittedAt: new Date(log.created_at) });
        results.sent.push('Daily Oil Level');
      }
    } catch (e) { console.error('Daily notif error [Oil Level]:', e.message); results.failed.push('Daily Oil Level'); }

    // DC Motor Airflow
    try {
      const r = await query(`SELECT l.*, u.username AS filled_by_name FROM hbm_dc_motor_airflow_logs l JOIN users u ON l.filled_by = u.id WHERE l.log_date = $1 ORDER BY l.created_at DESC LIMIT 1`, [today]);
      if (!r.rows.length) { results.skipped.push('DC Motor Airflow'); }
      else {
        const log = r.rows[0];
        const entries = await query(`SELECT * FROM hbm_dc_motor_airflow_entries WHERE log_id = $1 ORDER BY item_name`, [log.id]);
        await tg.sendDcMotorAirflowNotification({ date: log.log_date, shift: log.shift, remark: log.remark, entries: entries.rows, filledBy: log.filled_by_name, submittedAt: new Date(log.created_at) });
        results.sent.push('DC Motor Airflow');
      }
    } catch (e) { console.error('Daily notif error [DC Motor Airflow]:', e.message); results.failed.push('DC Motor Airflow'); }

    // Pump Parameter
    try {
      const r = await query(`SELECT l.*, u.username AS filled_by_name FROM hbm_pump_param_logs l JOIN users u ON l.filled_by = u.id WHERE l.log_date = $1 ORDER BY l.created_at DESC LIMIT 1`, [today]);
      if (!r.rows.length) { results.skipped.push('Pump Parameter'); }
      else {
        const log = r.rows[0];
        const pumps = await query(`SELECT * FROM hbm_pump_param_entries WHERE log_id = $1 ORDER BY pump_name`, [log.id]);
        const kwh   = await query(`SELECT * FROM hbm_pump_kwh_entries   WHERE log_id = $1 ORDER BY pump_name`, [log.id]);
        const sec2  = await query(`SELECT * FROM hbm_pump_param_sec2    WHERE log_id = $1 ORDER BY section_name, item_name`, [log.id]);
        await tg.sendPumpParamNotification({ date: log.log_date, shift: log.shift, remark: log.remark, pumps: pumps.rows, kwhEntries: kwh.rows, sec2Items: sec2.rows, filledBy: log.filled_by_name, submittedAt: new Date(log.created_at) });
        results.sent.push('Pump Parameter');
      }
    } catch (e) { console.error('Daily notif error [Pump Param]:', e.message); results.failed.push('Pump Parameter'); }

    // Water Parameter
    try {
      const r = await query(`SELECT l.*, u.username AS filled_by_name FROM hbm_water_param_logs l JOIN users u ON l.filled_by = u.id WHERE l.log_date = $1 ORDER BY l.created_at DESC LIMIT 1`, [today]);
      if (!r.rows.length) { results.skipped.push('Water Parameters'); }
      else {
        const log = r.rows[0];
        const entries = await query(`SELECT * FROM hbm_water_param_entries WHERE log_id = $1 ORDER BY water_source`, [log.id]);
        await tg.sendWaterParamNotification({ date: log.log_date, remark: log.remark, entries: entries.rows, filledBy: log.filled_by_name, submittedAt: new Date(log.created_at) });
        results.sent.push('Water Parameters');
      }
    } catch (e) { console.error('Daily notif error [Water Param]:', e.message); results.failed.push('Water Parameters'); }

    // PH Maintenance
    try {
      const r = await query(`SELECT l.*, u.username AS filled_by_name FROM hbm_ph_maint_logs l JOIN users u ON l.filled_by = u.id WHERE l.log_date = $1 ORDER BY l.created_at DESC LIMIT 1`, [today]);
      if (!r.rows.length) { results.skipped.push('PH Maintenance'); }
      else {
        const log = r.rows[0];
        const items = await query(`SELECT * FROM hbm_ph_maint_items WHERE log_id = $1 ORDER BY id`, [log.id]);
        await tg.sendPhMaintNotification({ date: log.log_date, items: items.rows, filledBy: log.filled_by_name, submittedAt: new Date(log.created_at) });
        results.sent.push('PH Maintenance');
      }
    } catch (e) { console.error('Daily notif error [PH Maint]:', e.message); results.failed.push('PH Maintenance'); }

    // Transformer
    try {
      const r = await query(`SELECT l.*, u.username AS filled_by_name FROM hbm_transformer_logs l JOIN users u ON l.filled_by = u.id WHERE l.log_date = $1 ORDER BY l.created_at DESC LIMIT 1`, [today]);
      if (!r.rows.length) { results.skipped.push('Transformer'); }
      else {
        const log = r.rows[0];
        const sec1 = await query(`SELECT * FROM hbm_transformer_sec1 WHERE log_id = $1 ORDER BY unit_name`, [log.id]);
        const sec2 = await query(`SELECT * FROM hbm_transformer_sec2 WHERE log_id = $1 ORDER BY unit_name`, [log.id]);
        const sec3 = await query(`SELECT * FROM hbm_transformer_sec3 WHERE log_id = $1 ORDER BY unit_name`, [log.id]);
        await tg.sendTransformerNotification({ date: log.log_date, sec1: sec1.rows, sec2: sec2.rows, sec3: sec3.rows, sec2Remark: log.sec2_remark, sec3Remark: log.sec3_remark, filledBy: log.filled_by_name, submittedAt: new Date(log.created_at) });
        results.sent.push('Transformer');
      }
    } catch (e) { console.error('Daily notif error [Transformer]:', e.message); results.failed.push('Transformer'); }

    // Roughing GB Temp — Section 1 data is columns on the log row itself
    try {
      const r = await query(`SELECT l.*, u.username AS filled_by_name FROM hbm_roughing_gb_temp_logs l JOIN users u ON l.filled_by = u.id WHERE l.log_date = $1 ORDER BY l.created_at DESC LIMIT 1`, [today]);
      if (!r.rows.length) { results.skipped.push('Roughing GB Temp'); }
      else {
        const log = r.rows[0];
        const stands = await query(`SELECT * FROM hbm_roughing_gb_temp_stands WHERE log_id = $1 ORDER BY stand_name`, [log.id]);
        const s1 = {
          flywheel_de:    log.s1_flywheel_de,   flywheel_nde:    log.s1_flywheel_nde,
          reduction_de:   log.s1_reduction_de,  reduction_nde:   log.s1_reduction_nde,
          pinion_de_top:  log.s1_pinion_de_top, pinion_de_mid:   log.s1_pinion_de_mid, pinion_de_bot:  log.s1_pinion_de_bot,
          pinion_nde_top: log.s1_pinion_nde_top,pinion_nde_mid:  log.s1_pinion_nde_mid,pinion_nde_bot: log.s1_pinion_nde_bot,
          stand_de_top:   log.s1_stand_de_top,  stand_de_mid:    log.s1_stand_de_mid,  stand_de_bot:   log.s1_stand_de_bot,
          stand_nde_top:  log.s1_stand_nde_top, stand_nde_mid:   log.s1_stand_nde_mid, stand_nde_bot:  log.s1_stand_nde_bot,
        };
        await tg.sendRoughingGbTempNotification({ date: log.log_date, shiftEng: log.shift_eng, tempTakenBy: log.temp_taken_by, s1, stands: stands.rows, sec1Remark: log.sec1_remark, sec2Remark: log.sec2_remark, sec3Remark: log.sec3_remark, filledBy: log.filled_by_name, submittedAt: new Date(log.created_at) });
        results.sent.push('Roughing GB Temp');
      }
    } catch (e) { console.error('Daily notif error [Roughing GB Temp]:', e.message); results.failed.push('Roughing GB Temp'); }

    // Breakdown
    try {
      const r = await query(`SELECT l.*, u.username AS filled_by_name FROM hbm_breakdown_logs l JOIN users u ON l.filled_by = u.id WHERE l.log_date = $1 ORDER BY l.created_at DESC LIMIT 1`, [today]);
      if (!r.rows.length) { results.skipped.push('HBM Breakdown'); }
      else {
        const log = r.rows[0];
        const slotsRes = await query(`SELECT * FROM hbm_breakdown_slots WHERE log_id = $1 ORDER BY slot_order`, [log.id]);
        const slots = await Promise.all(slotsRes.rows.map(async (s) => {
          const entries = await query(`SELECT * FROM hbm_breakdown_entries WHERE slot_id = $1`, [s.id]);
          return { ...s, entries: entries.rows };
        }));
        await tg.sendBreakdownNotification({ date: log.log_date, size: log.size, filledBy: log.filled_by_name, submittedAt: new Date(log.created_at), slots });
        results.sent.push('HBM Breakdown');
      }
    } catch (e) { console.error('Daily notif error [Breakdown]:', e.message); results.failed.push('HBM Breakdown'); }

    // Send daily status summary after all individual notifications
    try {
      await tg.sendDailyStatusSummary(today);
    } catch (e) { console.error('Daily status summary error:', e.message); }

    res.json({ success: true, results });
  }

  // ==========================================
  // DELETE HBM LOG (Admin only)
  // DELETE /api/hbm/:type/:id
  // ==========================================
  static async deleteHbmLog(req, res) {
    const TYPE_TABLE_MAP = {
      'dc-motor':         'hbm_dc_motor_logs',
      'cooling-bed':      'hbm_cooling_bed_logs',
      'mill-mech':        'hbm_mill_mech_logs',
      'rolling-stand':    'hbm_rolling_stand_logs',
      'pumphouse':        'hbm_pumphouse_logs',
      'bar-bundle':       'hbm_bar_bundle_logs',
      'before-rolling':   'hbm_before_rolling_logs',
      'pump-param':       'hbm_pump_param_logs',
      'transformer':      'hbm_transformer_logs',
      'ph-maint':         'hbm_ph_maint_logs',
      'water-param':      'hbm_water_param_logs',
      'oil-level':        'hbm_oil_level_logs',
      'dc-motor-airflow': 'hbm_dc_motor_airflow_logs',
      'roughing-gb-temp': 'hbm_roughing_gb_temp_logs',
      'breakdown':        'hbm_breakdown_logs',
    };
    try {
      if (req.user.user_type !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }
      const { type, id } = req.params;
      const table = TYPE_TABLE_MAP[type];
      if (!table) return res.status(400).json({ success: false, message: 'Invalid log type' });
      const result = await query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Log not found' });
      res.json({ success: true, message: 'Entry deleted successfully' });
    } catch (error) {
      console.error('Delete HBM log error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete entry', error: error.message });
    }
  }

  // ==========================================
  // RESEND TELEGRAM NOTIFICATION
  // POST /api/hbm/:type/:id/resend-telegram
  // ==========================================
  static async resendTelegramNotification(req, res) {
    const TYPE_MAP = {
      'dc-motor':        { table: 'hbm_dc_motor_logs',        items: 'hbm_dc_motor_items',         label: 'DC Motor',              orderBy: 'block_name, section_name, item_name' },
      'cooling-bed':     { table: 'hbm_cooling_bed_logs',     items: 'hbm_cooling_bed_items',      label: 'Cooling Bed',           orderBy: 'block_name, section_name, item_name' },
      'mill-mech':       { table: 'hbm_mill_mech_logs',       items: 'hbm_mill_mech_items',        label: 'Mill Mechanical',       orderBy: 'block_name, section_name, item_name' },
      'rolling-stand':   { table: 'hbm_rolling_stand_logs',   items: 'hbm_rolling_stand_items',    label: 'Rolling Stand',         orderBy: 'section_name, item_name' },
      'pumphouse':       { table: 'hbm_pumphouse_logs',       items: 'hbm_pumphouse_items',        label: 'Pumphouse',             orderBy: 'section_name, item_name' },
      'bar-bundle':      { table: 'hbm_bar_bundle_logs',      items: 'hbm_bar_bundle_items',       label: 'Bar Bundle Area',       orderBy: 'section_name, item_name' },
      'before-rolling':  { table: 'hbm_before_rolling_logs',  items: 'hbm_before_rolling_items',   label: 'Before Rolling',        orderBy: 'section_name, item_name' },
      'oil-level':       { table: 'hbm_oil_level_logs',       items: 'hbm_oil_level_entries',      label: 'Oil Level',             orderBy: 'item_name' },
      'dc-motor-airflow':{ table: 'hbm_dc_motor_airflow_logs',items: 'hbm_dc_motor_airflow_entries',label: 'DC Motor Airflow',     orderBy: 'item_name' },
      'roughing-gb-temp':{ table: 'hbm_roughing_gb_temp_logs',items: null,                          label: 'Roughing GB Temp',     orderBy: null },
      'transformer':     { table: 'hbm_transformer_logs',     items: null,                          label: 'Transformer',          orderBy: null },
      'pump-param':      { table: 'hbm_pump_param_logs',      items: null,                          label: 'Pump Parameter',       orderBy: null },
      'water-param':     { table: 'hbm_water_param_logs',     items: 'hbm_water_param_entries',    label: 'Water Parameter',       orderBy: 'water_source' },
      'ph-maint':        { table: 'hbm_ph_maint_logs',        items: null,                          label: 'Pumphouse Maintenance',orderBy: null },
      'breakdown':       { table: 'hbm_breakdown_logs',       items: null,                          label: 'HBM Breakdown Report', orderBy: null },
    };

    try {
      const { type, id } = req.params;
      const meta = TYPE_MAP[type];
      if (!meta) return res.status(400).json({ success: false, message: `Unknown checksheet type: ${type}` });

      const logRes = await query(
        `SELECT l.*, u.username AS filled_by_name FROM ${meta.table} l
         JOIN users u ON l.filled_by = u.id WHERE l.id = $1`,
        [id]
      );
      if (!logRes.rows.length) return res.status(404).json({ success: false, message: 'Log not found' });

      const log = logRes.rows[0];

      let items = [];
      if (meta.items) {
        const itemsRes = await query(
          `SELECT * FROM ${meta.items} WHERE log_id = $1 ORDER BY ${meta.orderBy}`,
          [id]
        );
        items = itemsRes.rows.map(r => ({
          section_name: r.section_name || r.water_source || '',
          block_name:   r.block_name   || '',
          item_name:    r.item_name    || r.water_source || '',
          status:       r.status       || (r.tds_status === 'NOT_OK' || r.ph_status === 'NOT_OK' || r.hardness_status === 'NOT_OK' || r.temp_status === 'NOT_OK' ? 'NOT_OK' : 'OK'),
          remark:       r.remark       || '',
          action_taken: r.action_taken || '',
        }));
      }

      const tgLib = require('../utils/telegram');

      // Special handlers for sheets that need extra DB queries
      if (type === 'roughing-gb-temp') {
        const stands = await query(`SELECT * FROM hbm_roughing_gb_temp_stands WHERE log_id = $1 ORDER BY stand_name`, [id]);
        const s1 = {
          flywheel_de: log.s1_flywheel_de, flywheel_nde: log.s1_flywheel_nde,
          reduction_de: log.s1_reduction_de, reduction_nde: log.s1_reduction_nde,
          pinion_de_top: log.s1_pinion_de_top, pinion_de_mid: log.s1_pinion_de_mid, pinion_de_bot: log.s1_pinion_de_bot,
          pinion_nde_top: log.s1_pinion_nde_top, pinion_nde_mid: log.s1_pinion_nde_mid, pinion_nde_bot: log.s1_pinion_nde_bot,
          stand_de_top: log.s1_stand_de_top, stand_de_mid: log.s1_stand_de_mid, stand_de_bot: log.s1_stand_de_bot,
          stand_nde_top: log.s1_stand_nde_top, stand_nde_mid: log.s1_stand_nde_mid, stand_nde_bot: log.s1_stand_nde_bot,
        };
        await tgLib.sendRoughingGbTempNotification({ date: log.log_date, shiftEng: log.shift_eng, tempTakenBy: log.temp_taken_by, s1, stands: stands.rows, sec1Remark: log.sec1_remark, sec2Remark: log.sec2_remark, sec3Remark: log.sec3_remark, filledBy: log.filled_by_name, submittedAt: new Date(log.created_at) });
      } else {
        const specificFn = {
          'cooling-bed':    tgLib.sendCoolingBedNotification,
          'mill-mech':      tgLib.sendMillMechNotification,
          'rolling-stand':  tgLib.sendRollingStandNotification,
          'bar-bundle':     tgLib.sendBarBundleNotification,
          'before-rolling': tgLib.sendBeforeRollingNotification,
        }[type];

        if (specificFn) {
          await specificFn({
            date: log.log_date, time: log.log_time || null, shift: log.shift || null,
            filledBy: log.filled_by_name, submittedAt: new Date(log.created_at),
            remarks: log.remarks || log.remark || null,
            checkedBy: log.checked_by, millShiftIncharge: log.mill_shift_incharge, mechEngineer: log.mechanical_engineer,
            items,
          });
        } else {
          await tgLib.sendHbmChecksheetNotification({
            checksheetType: meta.label,
            date: log.log_date, time: log.log_time || null, shift: log.shift || null,
            filledBy: log.filled_by_name, submittedAt: new Date(log.created_at),
            remarks: log.remarks || log.remark || null,
            items,
          });
        }
      }

      res.json({ success: true, message: `Telegram notification resent for ${meta.label} #${id}` });
    } catch (error) {
      console.error('HBM resend telegram error:', error);
      res.status(500).json({ success: false, message: 'Failed to resend notification' });
    }
  }

  // ==========================================
  // SEND DAILY STATUS SUMMARY
  // POST /api/hbm/send-status-summary
  // ==========================================
  static async sendStatusSummary(req, res) {
    const date = req.body.date || new Date().toISOString().split('T')[0];
    const { sendDailyStatusSummary } = require('../utils/telegram');
    try {
      await sendDailyStatusSummary(date);
      res.json({ success: true, message: `Daily status summary sent for ${date}` });
    } catch (error) {
      console.error('Status summary error:', error);
      res.status(500).json({ success: false, message: 'Failed to send status summary' });
    }
  }
}

/* ── PDF helper: row height ── */
function hbmRowHeight(doc, texts, widths, fontSize, minH = 22) {
  doc.font('Helvetica').fontSize(fontSize);
  const maxH = Math.max(
    ...texts.map((t, i) => doc.heightOfString(String(t || '-'), { width: widths[i] - 10 }))
  );
  return Math.max(maxH + 12, minH);
}

/* ── PDF helper: draw one table row ── */
function hbmDrawRow(doc, x, y, c1, c2, c3, c4, h, t1, t2, t3, t4, isHeader) {
  const total = c1 + c2 + c3 + c4;

  if (isHeader) {
    doc.rect(x, y, total, h).fill('#1e40af');
    doc.fillColor('#FFFFFF');
  } else {
    if (t2 === 'NOT_OK') {
      doc.rect(x, y, total, h).fill('#FEE2E2');
    }
    doc.fillColor('#000000');
  }

  doc.rect(x, y, total, h).stroke('#333333');
  doc.moveTo(x + c1, y).lineTo(x + c1, y + h).stroke('#333333');
  doc.moveTo(x + c1 + c2, y).lineTo(x + c1 + c2, y + h).stroke('#333333');
  doc.moveTo(x + c1 + c2 + c3, y).lineTo(x + c1 + c2 + c3, y + h).stroke('#333333');

  const ty = y + 6;
  const fs = isHeader ? 10 : 9;
  doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs);

  doc.text(t1 || '-', x + 5,          ty, { width: c1 - 10 });
  doc.text(t2 || '-', x + c1 + 5,     ty, { width: c2 - 10, lineBreak: false });
  doc.text(t3 || '-', x + c1 + c2 + 5, ty, { width: c3 - 10 });
  doc.text(t4 || '-', x + c1 + c2 + c3 + 5, ty, { width: c4 - 10 });

  doc.fillColor('#000000');
}

module.exports = HbmController;
