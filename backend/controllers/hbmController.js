const { query, transaction } = require('../config/database');

class HbmController {
  // ==========================================
  // DASHBOARD
  // ==========================================

  /**
   * GET /api/hbm/dashboard/stats
   * Returns summary stats for HBM module
   */
  static async getDashboardStats(req, res) {
    try {
      const [machinesResult, todayResult, issuesResult, templatesResult] = await Promise.all([
        query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active FROM hbm_machines'),
        query(
          `SELECT COUNT(*) as total
           FROM hbm_checksheets
           WHERE checksheet_date = CURRENT_DATE`
        ),
        query(
          `SELECT COUNT(*) as total
           FROM hbm_checksheets
           WHERE has_issues = true
             AND checksheet_date >= CURRENT_DATE - INTERVAL '7 days'`
        ),
        query('SELECT COUNT(*) as total FROM hbm_checksheet_templates WHERE is_active = true')
      ]);

      res.json({
        success: true,
        data: {
          total_machines: parseInt(machinesResult.rows[0].total),
          active_machines: parseInt(machinesResult.rows[0].active),
          today_checksheets: parseInt(todayResult.rows[0].total),
          weekly_issues: parseInt(issuesResult.rows[0].total),
          active_templates: parseInt(templatesResult.rows[0].total)
        }
      });
    } catch (error) {
      console.error('HBM dashboard stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
  }

  /**
   * GET /api/hbm/dashboard/recent
   * Returns recent checksheets
   */
  static async getRecentChecksheets(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const result = await query(
        `SELECT
          cs.id,
          cs.checksheet_date,
          cs.shift,
          cs.status,
          cs.has_issues,
          cs.issue_count,
          cs.remarks,
          cs.created_at,
          m.machine_name,
          m.machine_code,
          m.location,
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

  /**
   * GET /api/hbm/machines
   */
  static async getMachines(req, res) {
    try {
      const { active_only } = req.query;
      let sql = `
        SELECT
          m.*,
          COUNT(mt.id) as template_count
        FROM hbm_machines m
        LEFT JOIN hbm_machine_templates mt ON m.id = mt.machine_id
      `;
      const params = [];

      if (active_only === 'true') {
        sql += ' WHERE m.is_active = true';
      }

      sql += ' GROUP BY m.id ORDER BY m.machine_name';

      const result = await query(sql, params);
      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('HBM get machines error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch machines' });
    }
  }

  /**
   * GET /api/hbm/machines/:id
   */
  static async getMachineById(req, res) {
    try {
      const { id } = req.params;
      const result = await query(
        `SELECT m.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', t.id,
                'name', t.name,
                'frequency', t.frequency
              )
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'
          ) as templates
         FROM hbm_machines m
         LEFT JOIN hbm_machine_templates mt ON m.id = mt.machine_id
         LEFT JOIN hbm_checksheet_templates t ON mt.template_id = t.id
         WHERE m.id = $1
         GROUP BY m.id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Machine not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('HBM get machine error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch machine' });
    }
  }

  /**
   * POST /api/hbm/machines
   */
  static async createMachine(req, res) {
    try {
      const { machine_name, machine_code, location, department, machine_type, manufacturer, model, serial_number, installation_date } = req.body;

      if (!machine_name || !machine_code) {
        return res.status(400).json({ success: false, message: 'Machine name and code are required' });
      }

      const existing = await query('SELECT id FROM hbm_machines WHERE machine_code = $1', [machine_code]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Machine code already exists' });
      }

      const result = await query(
        `INSERT INTO hbm_machines (machine_name, machine_code, location, department, machine_type, manufacturer, model, serial_number, installation_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [machine_name, machine_code, location, department, machine_type, manufacturer, model, serial_number, installation_date]
      );

      res.status(201).json({ success: true, message: 'Machine created', data: result.rows[0] });
    } catch (error) {
      console.error('HBM create machine error:', error);
      res.status(500).json({ success: false, message: 'Failed to create machine' });
    }
  }

  /**
   * PUT /api/hbm/machines/:id
   */
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
         WHERE id = $11
         RETURNING *`,
        [machine_name, machine_code, location, department, machine_type, manufacturer, model, serial_number, installation_date, is_active, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Machine not found' });
      }

      res.json({ success: true, message: 'Machine updated', data: result.rows[0] });
    } catch (error) {
      console.error('HBM update machine error:', error);
      res.status(500).json({ success: false, message: 'Failed to update machine' });
    }
  }

  /**
   * DELETE /api/hbm/machines/:id
   */
  static async deleteMachine(req, res) {
    try {
      const { id } = req.params;
      const result = await query('DELETE FROM hbm_machines WHERE id = $1 RETURNING id, machine_name', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Machine not found' });
      }

      res.json({ success: true, message: 'Machine deleted', data: result.rows[0] });
    } catch (error) {
      console.error('HBM delete machine error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete machine' });
    }
  }

  // ==========================================
  // CHECKSHEET TEMPLATES
  // ==========================================

  /**
   * GET /api/hbm/templates
   */
  static async getTemplates(req, res) {
    try {
      const result = await query(
        `SELECT t.*,
          u.username as created_by_name,
          COUNT(DISTINCT s.id) as section_count,
          COUNT(DISTINCT i.id) as item_count
         FROM hbm_checksheet_templates t
         LEFT JOIN users u ON t.created_by = u.id
         LEFT JOIN hbm_checksheet_sections s ON t.id = s.template_id
         LEFT JOIN hbm_checksheet_items i ON s.id = i.section_id
         WHERE t.is_active = true
         GROUP BY t.id, u.username
         ORDER BY t.name`
      );

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('HBM get templates error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
  }

  /**
   * GET /api/hbm/templates/:id
   * Returns template with sections and items
   */
  static async getTemplateById(req, res) {
    try {
      const { id } = req.params;

      const templateResult = await query(
        'SELECT * FROM hbm_checksheet_templates WHERE id = $1',
        [id]
      );

      if (templateResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }

      const sectionsResult = await query(
        `SELECT s.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', i.id,
                'check_point', i.check_point,
                'check_type', i.check_type,
                'display_order', i.display_order,
                'unit', i.unit,
                'min_value', i.min_value,
                'max_value', i.max_value,
                'is_critical', i.is_critical
              ) ORDER BY i.display_order
            ) FILTER (WHERE i.id IS NOT NULL),
            '[]'
          ) as items
         FROM hbm_checksheet_sections s
         LEFT JOIN hbm_checksheet_items i ON s.id = i.section_id
         WHERE s.template_id = $1
         GROUP BY s.id
         ORDER BY s.display_order`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...templateResult.rows[0],
          sections: sectionsResult.rows
        }
      });
    } catch (error) {
      console.error('HBM get template error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch template' });
    }
  }

  // ==========================================
  // CHECKSHEETS (filled)
  // ==========================================

  /**
   * GET /api/hbm/checksheets
   */
  static async getChecksheets(req, res) {
    try {
      const { machine_id, date_from, date_to, status, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (machine_id) {
        conditions.push(`cs.machine_id = $${paramIdx++}`);
        params.push(machine_id);
      }
      if (date_from) {
        conditions.push(`cs.checksheet_date >= $${paramIdx++}`);
        params.push(date_from);
      }
      if (date_to) {
        conditions.push(`cs.checksheet_date <= $${paramIdx++}`);
        params.push(date_to);
      }
      if (status) {
        conditions.push(`cs.status = $${paramIdx++}`);
        params.push(status);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

      params.push(limit);
      const result = await query(
        `SELECT
          cs.id,
          cs.checksheet_date,
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

  /**
   * GET /api/hbm/checksheets/:id
   * Returns checksheet with all filled values
   */
  static async getChecksheetById(req, res) {
    try {
      const { id } = req.params;

      const csResult = await query(
        `SELECT
          cs.*,
          m.machine_name,
          m.machine_code,
          m.location,
          t.name as template_name,
          u.username as filled_by_name
         FROM hbm_checksheets cs
         JOIN hbm_machines m ON cs.machine_id = m.id
         JOIN hbm_checksheet_templates t ON cs.template_id = t.id
         JOIN users u ON cs.filled_by = u.id
         WHERE cs.id = $1`,
        [id]
      );

      if (csResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Checksheet not found' });
      }

      const valuesResult = await query(
        `SELECT
          v.*,
          i.check_point,
          i.check_type,
          i.unit,
          i.min_value,
          i.max_value,
          i.is_critical,
          s.name as section_name,
          s.display_order as section_order
         FROM hbm_checksheet_values v
         JOIN hbm_checksheet_items i ON v.item_id = i.id
         JOIN hbm_checksheet_sections s ON i.section_id = s.id
         WHERE v.checksheet_id = $1
         ORDER BY s.display_order, i.display_order`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...csResult.rows[0],
          values: valuesResult.rows
        }
      });
    } catch (error) {
      console.error('HBM get checksheet error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch checksheet' });
    }
  }

  /**
   * POST /api/hbm/checksheets
   * Submit a filled checksheet
   */
  static async createChecksheet(req, res) {
    try {
      const { machine_id, template_id, checksheet_date, shift, remarks, items } = req.body;

      if (!machine_id || !template_id || !checksheet_date) {
        return res.status(400).json({
          success: false,
          message: 'Machine, template, and date are required'
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Checksheet items are required'
        });
      }

      let checksheet;
      await transaction(async (client) => {
        // Detect issues
        let issueCount = 0;
        for (const item of items) {
          if (item.is_issue) issueCount++;
        }

        const hasIssues = issueCount > 0;
        const status = issueCount === 0 ? 'OK' : (items.some(i => i.is_critical_issue) ? 'CRITICAL' : 'ATTENTION_REQUIRED');

        // Insert checksheet header
        const csResult = await client.query(
          `INSERT INTO hbm_checksheets (machine_id, template_id, checksheet_date, shift, status, has_issues, issue_count, remarks, filled_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [machine_id, template_id, checksheet_date, shift || 'GENERAL', status, hasIssues, issueCount, remarks, req.user.id]
        );

        checksheet = csResult.rows[0];

        // Insert values
        for (const item of items) {
          await client.query(
            `INSERT INTO hbm_checksheet_values (checksheet_id, item_id, value, is_issue, remarks)
             VALUES ($1, $2, $3, $4, $5)`,
            [checksheet.id, item.item_id, item.value, item.is_issue || false, item.remarks]
          );
        }
      });

      res.status(201).json({
        success: true,
        message: 'Checksheet submitted successfully',
        data: checksheet
      });
    } catch (error) {
      console.error('HBM create checksheet error:', error);
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'A checksheet for this machine, template, date and shift already exists'
        });
      }
      res.status(500).json({ success: false, message: 'Failed to submit checksheet' });
    }
  }

  // ==========================================
  // MACHINE-TEMPLATE ASSIGNMENT
  // ==========================================

  /**
   * GET /api/hbm/machines/:id/templates
   */
  static async getMachineTemplates(req, res) {
    try {
      const { id } = req.params;
      const result = await query(
        `SELECT t.*
         FROM hbm_checksheet_templates t
         JOIN hbm_machine_templates mt ON t.id = mt.template_id
         WHERE mt.machine_id = $1 AND t.is_active = true
         ORDER BY t.name`,
        [id]
      );

      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('HBM get machine templates error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch machine templates' });
    }
  }

  /**
   * POST /api/hbm/machines/:id/templates
   * Assign template to machine
   */
  static async assignTemplate(req, res) {
    try {
      const { id } = req.params;
      const { template_id } = req.body;

      if (!template_id) {
        return res.status(400).json({ success: false, message: 'Template ID is required' });
      }

      const result = await query(
        `INSERT INTO hbm_machine_templates (machine_id, template_id)
         VALUES ($1, $2)
         ON CONFLICT (machine_id, template_id) DO NOTHING
         RETURNING *`,
        [id, template_id]
      );

      res.status(201).json({ success: true, message: 'Template assigned', data: result.rows[0] });
    } catch (error) {
      console.error('HBM assign template error:', error);
      res.status(500).json({ success: false, message: 'Failed to assign template' });
    }
  }
}

module.exports = HbmController;
