const { query, transaction } = require('../config/database');

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
    } catch (error) {
      console.error('Rolling Stand create log error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit Rolling Stand log' });
    }
  }
}

module.exports = HbmController;
