const { query, transaction } = require('../config/database');

class PtmController {

  // ==========================================
  // DASHBOARD
  // ==========================================

  static async getDashboardStats(req, res) {
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const dateFrom = `${y}-${String(m).padStart(2,'0')}-01`;
      const dateTo   = new Date(y, m, 0).toISOString().slice(0, 10);

      const [templatesRes, todayRes, notOkRes, bkMinRes] = await Promise.all([
        query('SELECT COUNT(*) as total FROM ptm_templates WHERE is_active = true'),
        query('SELECT COUNT(DISTINCT id) as total FROM ptm_logs WHERE log_date = CURRENT_DATE'),
        query(`
          SELECT COUNT(*) as total FROM ptm_log_entries e
          JOIN ptm_logs l ON l.id = e.log_id
          WHERE l.log_date >= $1 AND l.log_date <= $2 AND e.status = 'NOT_OK'
        `, [dateFrom, dateTo]),
        query(`
          SELECT COALESCE(SUM(be.breakdown_minutes),0) as total
          FROM ptm_breakdown_entries be
          JOIN ptm_breakdown_slots bs ON bs.id = be.slot_id
          JOIN ptm_breakdown_logs bl ON bl.id = bs.log_id
          WHERE bl.log_date >= $1 AND bl.log_date <= $2
        `, [dateFrom, dateTo]),
      ]);

      res.json({
        success: true,
        data: {
          active_templates: parseInt(templatesRes.rows[0].total),
          logs_today:        parseInt(todayRes.rows[0].total),
          not_ok_this_month: parseInt(notOkRes.rows[0].total),
          breakdown_minutes_this_month: parseInt(bkMinRes.rows[0].total),
        }
      });
    } catch (error) {
      console.error('PTM dashboard stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
  }

  // ==========================================
  // TEMPLATES
  // ==========================================

  static async getTemplates(req, res) {
    try {
      const result = await query(
        `SELECT t.*, COUNT(i.id) as item_count
         FROM ptm_templates t
         LEFT JOIN ptm_template_items i ON i.template_id = t.id AND i.is_active = true
         WHERE t.is_active = true
         GROUP BY t.id ORDER BY t.name`
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('PTM getTemplates error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
  }

  static async getTemplateById(req, res) {
    try {
      const { id } = req.params;
      const tRes = await query('SELECT * FROM ptm_templates WHERE id = $1', [id]);
      if (!tRes.rows.length) return res.status(404).json({ success: false, message: 'Template not found' });

      const iRes = await query(
        `SELECT * FROM ptm_template_items WHERE template_id = $1 AND is_active = true ORDER BY section_name, item_order, id`,
        [id]
      );
      res.json({ success: true, data: { ...tRes.rows[0], items: iRes.rows } });
    } catch (error) {
      console.error('PTM getTemplateById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch template' });
    }
  }

  static async createTemplate(req, res) {
    try {
      const { name, type } = req.body;
      if (!name || !type) return res.status(400).json({ success: false, message: 'Name and type are required' });
      const result = await query(
        'INSERT INTO ptm_templates (name, type) VALUES ($1, $2) RETURNING *',
        [name, type]
      );
      res.status(201).json({ success: true, message: 'Template created', data: result.rows[0] });
    } catch (error) {
      console.error('PTM createTemplate error:', error);
      res.status(500).json({ success: false, message: 'Failed to create template' });
    }
  }

  static async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const { name, is_active } = req.body;
      const result = await query(
        `UPDATE ptm_templates SET
           name = COALESCE($1, name),
           is_active = COALESCE($2, is_active)
         WHERE id = $3 RETURNING *`,
        [name, is_active, id]
      );
      if (!result.rows.length) return res.status(404).json({ success: false, message: 'Template not found' });
      res.json({ success: true, message: 'Template updated', data: result.rows[0] });
    } catch (error) {
      console.error('PTM updateTemplate error:', error);
      res.status(500).json({ success: false, message: 'Failed to update template' });
    }
  }

  static async addTemplateItem(req, res) {
    try {
      const { id } = req.params;
      const { section_name, item_name, item_order } = req.body;
      if (!item_name) return res.status(400).json({ success: false, message: 'Item name is required' });
      const result = await query(
        `INSERT INTO ptm_template_items (template_id, section_name, item_name, item_order)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [id, section_name || 'General', item_name, item_order || 0]
      );
      res.status(201).json({ success: true, message: 'Item added', data: result.rows[0] });
    } catch (error) {
      console.error('PTM addTemplateItem error:', error);
      res.status(500).json({ success: false, message: 'Failed to add item' });
    }
  }

  static async updateTemplateItem(req, res) {
    try {
      const { id, itemId } = req.params;
      const { section_name, item_name, item_order, is_active } = req.body;
      const result = await query(
        `UPDATE ptm_template_items SET
           section_name = COALESCE($1, section_name),
           item_name    = COALESCE($2, item_name),
           item_order   = COALESCE($3, item_order),
           is_active    = COALESCE($4, is_active)
         WHERE id = $5 AND template_id = $6 RETURNING *`,
        [section_name, item_name, item_order, is_active, itemId, id]
      );
      if (!result.rows.length) return res.status(404).json({ success: false, message: 'Item not found' });
      res.json({ success: true, message: 'Item updated', data: result.rows[0] });
    } catch (error) {
      console.error('PTM updateTemplateItem error:', error);
      res.status(500).json({ success: false, message: 'Failed to update item' });
    }
  }

  static async deleteTemplateItem(req, res) {
    try {
      const { itemId } = req.params;
      const result = await query('DELETE FROM ptm_template_items WHERE id = $1 RETURNING id', [itemId]);
      if (!result.rows.length) return res.status(404).json({ success: false, message: 'Item not found' });
      res.json({ success: true, message: 'Item deleted' });
    } catch (error) {
      console.error('PTM deleteTemplateItem error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete item' });
    }
  }

  // ==========================================
  // LOGS
  // ==========================================

  static async getLogs(req, res) {
    try {
      const { template_id, date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let idx = 1;

      if (template_id) { conditions.push(`l.template_id = $${idx++}`); params.push(template_id); }
      if (date_from)   { conditions.push(`l.log_date >= $${idx++}`);    params.push(date_from); }
      if (date_to)     { conditions.push(`l.log_date <= $${idx++}`);    params.push(date_to); }

      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT l.id, l.log_date, l.shift, l.remark, l.created_at,
                t.name as template_name, t.type as template_type,
                u.username as filled_by_name,
                COUNT(e.id) as total_items,
                COUNT(e.id) FILTER (WHERE e.status = 'NOT_OK') as not_ok_count
         FROM ptm_logs l
         JOIN ptm_templates t ON t.id = l.template_id
         JOIN users u ON u.id = l.filled_by
         LEFT JOIN ptm_log_entries e ON e.log_id = l.id
         ${where}
         GROUP BY l.id, t.name, t.type, u.username
         ORDER BY l.log_date DESC, l.created_at DESC
         LIMIT $${idx}`,
        params
      );
      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('PTM getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }
  }

  static async getLogById(req, res) {
    try {
      const { id } = req.params;
      const logRes = await query(
        `SELECT l.*, t.name as template_name, t.type as template_type, u.username as filled_by_name
         FROM ptm_logs l
         JOIN ptm_templates t ON t.id = l.template_id
         JOIN users u ON u.id = l.filled_by
         WHERE l.id = $1`,
        [id]
      );
      if (!logRes.rows.length) return res.status(404).json({ success: false, message: 'Log not found' });

      const entriesRes = await query(
        `SELECT e.*, i.item_name, i.section_name
         FROM ptm_log_entries e
         JOIN ptm_template_items i ON i.id = e.item_id
         WHERE e.log_id = $1
         ORDER BY i.section_name, i.item_order, i.id`,
        [id]
      );
      res.json({ success: true, data: { ...logRes.rows[0], entries: entriesRes.rows } });
    } catch (error) {
      console.error('PTM getLogById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch log' });
    }
  }

  static async createLog(req, res) {
    try {
      const { template_id, log_date, shift, remark, entries } = req.body;
      if (!template_id || !log_date) {
        return res.status(400).json({ success: false, message: 'Template and date are required' });
      }
      if (!entries || !Array.isArray(entries) || !entries.length) {
        return res.status(400).json({ success: false, message: 'Entries are required' });
      }

      // Validate NOT_OK entries
      const tplRes = await query('SELECT type FROM ptm_templates WHERE id = $1', [template_id]);
      if (!tplRes.rows.length) return res.status(404).json({ success: false, message: 'Template not found' });
      const tplType = tplRes.rows[0].type;

      if (tplType !== 'parameter') {
        for (const entry of entries) {
          if (entry.status === 'NOT_OK') {
            if (!entry.remark || !entry.remark.trim()) {
              return res.status(400).json({ success: false, message: 'Remark is required for NOT OK items' });
            }
            if (!entry.action_taken || !entry.action_taken.trim()) {
              return res.status(400).json({ success: false, message: 'Action Taken is required for NOT OK items' });
            }
          }
        }
      }

      let log;
      await transaction(async (client) => {
        // Upsert log
        const logRes = await client.query(
          `INSERT INTO ptm_logs (template_id, log_date, shift, remark, filled_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (template_id, log_date)
           DO UPDATE SET shift = EXCLUDED.shift, remark = EXCLUDED.remark, filled_by = EXCLUDED.filled_by
           RETURNING *`,
          [template_id, log_date, shift || null, remark || null, req.user.id]
        );
        log = logRes.rows[0];

        // Delete old entries
        await client.query('DELETE FROM ptm_log_entries WHERE log_id = $1', [log.id]);

        // Insert new entries
        for (const entry of entries) {
          await client.query(
            `INSERT INTO ptm_log_entries (log_id, item_id, status, value_text, remark, action_taken)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [log.id, entry.item_id, entry.status || null, entry.value_text || null, entry.remark || null, entry.action_taken || null]
          );
        }
      });

      res.status(201).json({ success: true, message: 'Checksheet submitted', data: log });
    } catch (error) {
      console.error('PTM createLog error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit checksheet' });
    }
  }

  // ==========================================
  // MONTHLY REGISTER
  // ==========================================

  static async getMonthlyRegister(req, res) {
    try {
      const { templateId } = req.params;
      const { year, month } = req.query;
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month) || (new Date().getMonth() + 1);
      const dateFrom = `${y}-${String(m).padStart(2,'0')}-01`;
      const dateTo   = new Date(y, m, 0).toISOString().slice(0, 10);
      const daysInMonth = new Date(y, m, 0).getDate();

      // Get template info
      const tplRes = await query('SELECT * FROM ptm_templates WHERE id = $1', [templateId]);
      if (!tplRes.rows.length) return res.status(404).json({ success: false, message: 'Template not found' });
      const tpl = tplRes.rows[0];
      const paramType = tpl.type === 'parameter';

      // Get logs in range
      const logsRes = await query(
        `SELECT l.id, l.log_date, l.shift, u.username as filled_by
         FROM ptm_logs l
         LEFT JOIN users u ON u.id = l.filled_by
         WHERE l.template_id = $1 AND l.log_date >= $2 AND l.log_date <= $3
         ORDER BY l.log_date`,
        [templateId, dateFrom, dateTo]
      );

      const dateToLog = {};
      for (const log of logsRes.rows) {
        const d = String(log.log_date).slice(0, 10);
        if (!dateToLog[d]) dateToLog[d] = log;
      }

      const days = Array.from({ length: daysInMonth }, (_, i) => {
        const d = `${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
        const log = dateToLog[d];
        return { date: d, day: i + 1, filled: !!log, shift: log?.shift || null, filledBy: log?.filled_by || null };
      });

      if (!logsRes.rows.length) {
        return res.json({ success: true, data: { templateId, templateName: tpl.name, year: y, month: m, daysInMonth, days, items: [], paramType } });
      }

      const logIds = logsRes.rows.map(r => r.id);

      const entriesRes = await query(
        `SELECT e.log_id, e.item_id, e.status, e.value_text, e.remark, e.action_taken,
                i.section_name, i.item_name, i.item_order
         FROM ptm_log_entries e
         JOIN ptm_template_items i ON i.id = e.item_id
         WHERE e.log_id = ANY($1)
         ORDER BY i.section_name, i.item_order, i.id`,
        [logIds]
      );

      // Build pivot
      const itemKeySet = [];
      const itemKeyMap = {};
      for (const row of entriesRes.rows) {
        const key = `${row.section_name}||${row.item_id}`;
        if (!itemKeyMap[key]) {
          itemKeyMap[key] = { section: row.section_name, item: row.item_name, itemId: row.item_id };
          itemKeySet.push(key);
        }
      }

      const pivot = {};
      for (const row of entriesRes.rows) {
        const key = `${row.section_name}||${row.item_id}`;
        const log = logsRes.rows.find(l => l.id === row.log_id);
        if (!log) continue;
        const d = String(log.log_date).slice(0, 10);
        if (!pivot[key]) pivot[key] = {};
        pivot[key][d] = { status: row.status, value: row.value_text, remark: row.remark, action_taken: row.action_taken };
      }

      const items = itemKeySet.map(key => {
        const meta = itemKeyMap[key];
        const cells = {};
        for (const day of days) cells[day.date] = pivot[key]?.[day.date] || null;
        return { section: meta.section, item: meta.item, itemId: meta.itemId, cells };
      });

      res.json({ success: true, data: { templateId, templateName: tpl.name, year: y, month: m, daysInMonth, days, items, paramType } });
    } catch (error) {
      console.error('PTM getMonthlyRegister error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch monthly register' });
    }
  }

  // ==========================================
  // BREAKDOWN
  // ==========================================

  static async getBreakdownLogs(req, res) {
    try {
      const { date_from, date_to, limit: lim } = req.query;
      const limit = parseInt(lim) || 50;
      const conditions = [];
      const params = [];
      let idx = 1;

      if (date_from) { conditions.push(`bl.log_date >= $${idx++}`); params.push(date_from); }
      if (date_to)   { conditions.push(`bl.log_date <= $${idx++}`); params.push(date_to); }

      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      params.push(limit);

      const result = await query(
        `SELECT bl.id, bl.log_date, bl.size, bl.created_at,
                u.username as filled_by_name,
                COALESCE(SUM(be.breakdown_minutes),0) as total_minutes
         FROM ptm_breakdown_logs bl
         JOIN users u ON u.id = bl.filled_by
         LEFT JOIN ptm_breakdown_slots bs ON bs.log_id = bl.id
         LEFT JOIN ptm_breakdown_entries be ON be.slot_id = bs.id
         ${where}
         GROUP BY bl.id, u.username
         ORDER BY bl.log_date DESC
         LIMIT $${idx}`,
        params
      );
      res.json({ success: true, data: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('PTM getBreakdownLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch breakdown logs' });
    }
  }

  static async getBreakdownLogById(req, res) {
    try {
      const { id } = req.params;
      const logRes = await query(
        `SELECT bl.*, u.username as filled_by_name
         FROM ptm_breakdown_logs bl
         JOIN users u ON u.id = bl.filled_by
         WHERE bl.id = $1`,
        [id]
      );
      if (!logRes.rows.length) return res.status(404).json({ success: false, message: 'Breakdown log not found' });

      const slotsRes = await query(
        'SELECT * FROM ptm_breakdown_slots WHERE log_id = $1 ORDER BY slot_order',
        [id]
      );

      const slots = await Promise.all(slotsRes.rows.map(async (slot) => {
        const entriesRes = await query(
          'SELECT * FROM ptm_breakdown_entries WHERE slot_id = $1',
          [slot.id]
        );
        return { ...slot, entries: entriesRes.rows };
      }));

      res.json({ success: true, data: { ...logRes.rows[0], slots } });
    } catch (error) {
      console.error('PTM getBreakdownLogById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch breakdown log' });
    }
  }

  static async createBreakdownLog(req, res) {
    try {
      const { log_date, size, slots } = req.body;
      if (!log_date) return res.status(400).json({ success: false, message: 'Date is required' });
      if (!slots || !Array.isArray(slots)) return res.status(400).json({ success: false, message: 'Slots are required' });

      let log;
      await transaction(async (client) => {
        // Upsert breakdown log
        const existRes = await client.query('SELECT id FROM ptm_breakdown_logs WHERE log_date = $1', [log_date]);
        let logId;
        if (existRes.rows.length) {
          logId = existRes.rows[0].id;
          await client.query('UPDATE ptm_breakdown_logs SET size=$1, filled_by=$2 WHERE id=$3', [size || null, req.user.id, logId]);
          // Delete old slots (cascade deletes entries)
          await client.query('DELETE FROM ptm_breakdown_slots WHERE log_id = $1', [logId]);
        } else {
          const ins = await client.query(
            'INSERT INTO ptm_breakdown_logs (log_date, size, filled_by) VALUES ($1,$2,$3) RETURNING *',
            [log_date, size || null, req.user.id]
          );
          logId = ins.rows[0].id;
          log = ins.rows[0];
        }

        for (const slot of slots) {
          const slotRes = await client.query(
            'INSERT INTO ptm_breakdown_slots (log_id, slot_label, slot_order, miss_roll, pipe_pieces, pipe_length_m) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
            [logId, slot.slot_label, slot.slot_order, parseInt(slot.miss_roll) || 0, slot.pipe_pieces || null, parseFloat(slot.pipe_length_m) || 6]
          );
          const slotId = slotRes.rows[0].id;
          for (const entry of (slot.entries || [])) {
            if (!entry.breakdown_type && !entry.breakdown_minutes) continue;
            await client.query(
              'INSERT INTO ptm_breakdown_entries (slot_id, breakdown_type, breakdown_minutes, breakdown_reason, repeated_count) VALUES ($1,$2,$3,$4,$5)',
              [slotId, entry.breakdown_type || null, parseInt(entry.breakdown_minutes) || 0, entry.breakdown_reason || null, entry.repeated_count ? parseInt(entry.repeated_count) : null]
            );
          }
        }

        if (!log) {
          const logRes = await client.query('SELECT * FROM ptm_breakdown_logs WHERE id=$1', [logId]);
          log = logRes.rows[0];
        }
      });

      res.status(201).json({ success: true, message: 'Breakdown log submitted', data: log });
    } catch (error) {
      console.error('PTM createBreakdownLog error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit breakdown log' });
    }
  }

  static async getBreakdownReasons(req, res) {
    try {
      const { q } = req.query;
      const result = await query(
        `SELECT DISTINCT breakdown_reason as reason
         FROM ptm_breakdown_entries
         WHERE breakdown_reason IS NOT NULL AND breakdown_reason ILIKE $1
         ORDER BY reason LIMIT 15`,
        [`%${q || ''}%`]
      );
      res.json({ success: true, reasons: result.rows.map(r => r.reason) });
    } catch (error) {
      console.error('PTM getBreakdownReasons error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch reasons' });
    }
  }

  // ==========================================
  // CONFIG — Mills
  // ==========================================

  static async getMills(req, res) {
    try {
      const { rows } = await query('SELECT * FROM ptm_mills ORDER BY display_order, id');
      res.json({ success: true, mills: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  static async createMill(req, res) {
    try {
      const { name } = req.body;
      const { rows: existing } = await query('SELECT MAX(display_order) AS mx FROM ptm_mills');
      const order = (existing[0].mx || 0) + 1;
      const { rows } = await query('INSERT INTO ptm_mills (name, display_order) VALUES ($1,$2) RETURNING *', [name, order]);
      res.json({ success: true, mill: rows[0] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  static async updateMill(req, res) {
    try {
      const { id } = req.params;
      const { name, is_active } = req.body;
      const { rows } = await query('UPDATE ptm_mills SET name=$1, is_active=$2 WHERE id=$3 RETURNING *', [name, is_active, id]);
      res.json({ success: true, mill: rows[0] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  static async deleteMill(req, res) {
    try {
      await query('DELETE FROM ptm_mills WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  // ==========================================
  // CONFIG — Breakdown Types
  // ==========================================

  static async getBreakdownTypes(req, res) {
    try {
      const { rows } = await query('SELECT * FROM ptm_breakdown_types ORDER BY display_order, id');
      res.json({ success: true, breakdown_types: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  static async createBreakdownType(req, res) {
    try {
      const { name, has_size_change } = req.body;
      const { rows: existing } = await query('SELECT MAX(display_order) AS mx FROM ptm_breakdown_types');
      const order = (existing[0].mx || 0) + 1;
      const { rows } = await query('INSERT INTO ptm_breakdown_types (name, has_size_change, display_order) VALUES ($1,$2,$3) RETURNING *', [name, has_size_change || false, order]);
      res.json({ success: true, breakdown_type: rows[0] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  static async updateBreakdownType(req, res) {
    try {
      const { id } = req.params;
      const { name, has_size_change, is_active } = req.body;
      const { rows } = await query('UPDATE ptm_breakdown_types SET name=$1, has_size_change=$2, is_active=$3 WHERE id=$4 RETURNING *', [name, has_size_change, is_active, id]);
      res.json({ success: true, breakdown_type: rows[0] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  static async deleteBreakdownType(req, res) {
    try {
      await query('DELETE FROM ptm_breakdown_types WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  // ==========================================
  // CONFIG — Sizes
  // ==========================================

  static async getSizes(req, res) {
    try {
      const { rows } = await query('SELECT * FROM ptm_sizes ORDER BY display_order, id');
      res.json({ success: true, sizes: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  static async createSize(req, res) {
    try {
      const { size_label } = req.body;
      const { rows: existing } = await query('SELECT MAX(display_order) AS mx FROM ptm_sizes');
      const order = (existing[0].mx || 0) + 1;
      const { rows } = await query('INSERT INTO ptm_sizes (size_label, display_order) VALUES ($1,$2) RETURNING *', [size_label, order]);
      res.json({ success: true, size: rows[0] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  static async updateSize(req, res) {
    try {
      const { id } = req.params;
      const { size_label, is_active } = req.body;
      const { rows } = await query('UPDATE ptm_sizes SET size_label=$1, is_active=$2 WHERE id=$3 RETURNING *', [size_label, is_active, id]);
      res.json({ success: true, size: rows[0] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  static async deleteSize(req, res) {
    try {
      await query('DELETE FROM ptm_sizes WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }
}

module.exports = PtmController;
