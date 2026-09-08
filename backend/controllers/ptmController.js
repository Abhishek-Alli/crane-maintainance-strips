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
            'INSERT INTO ptm_breakdown_slots (log_id, slot_label, slot_order, miss_roll, pipe_pieces, pipe_length_m, total_minutes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
            [logId, slot.slot_label, slot.slot_order, parseInt(slot.miss_roll) || 0, slot.pipe_pieces || null, parseFloat(slot.pipe_length_m) || 6, parseInt(slot.total_minutes) || 1440]
          );
          const slotId = slotRes.rows[0].id;
          for (const entry of (slot.entries || [])) {
            if (!entry.breakdown_type && !entry.breakdown_minutes) continue;
            await client.query(
              `INSERT INTO ptm_breakdown_entries
                 (slot_id, breakdown_type, breakdown_minutes, breakdown_reason, repeated_count, size, pipe_pieces, pipe_length_m, remarks, production_mt)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
              [slotId, entry.breakdown_type || null, parseInt(entry.breakdown_minutes) || 0, entry.breakdown_reason || null,
                entry.repeated_count ? parseInt(entry.repeated_count) : null,
                entry.size || null,
                entry.pipe_pieces != null && entry.pipe_pieces !== '' ? parseInt(entry.pipe_pieces) : null,
                entry.pipe_length_m != null && entry.pipe_length_m !== '' ? parseFloat(entry.pipe_length_m) : null,
                entry.remarks || null,
                entry.production_mt != null && entry.production_mt !== '' ? parseFloat(entry.production_mt) : null]
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

  // ==========================================
  // BREAKDOWN — Excel import
  // ==========================================

  static _cellRaw(value) {
    if (value == null) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (value.result != null) return PtmController._cellRaw(value.result);
      if (value.text != null) return value.text;
      if (value.richText && Array.isArray(value.richText)) {
        return value.richText.map((t) => t.text || '').join('');
      }
    }
    return value;
  }

  static _formatDateYmd(y, m, d) {
    if (!y || !m || !d) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  static _parseExcelDate(value) {
    const v = PtmController._cellRaw(value);
    if (v == null || v === '') return null;

    if (v instanceof Date && !Number.isNaN(v.getTime())) {
      return PtmController._formatDateYmd(v.getFullYear(), v.getMonth() + 1, v.getDate());
    }
    if (typeof v === 'number' && !Number.isNaN(v)) {
      if (v > 0 && v < 1) return null;
      const epoch = Date.UTC(1899, 11, 30);
      const d = new Date(epoch + Math.floor(v) * 86400000);
      if (!Number.isNaN(d.getTime())) {
        return PtmController._formatDateYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      }
    }

    const s = String(v).trim().replace(/\./g, '-').replace(/\//g, '-');
    if (!s) return null;

    let m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) return PtmController._formatDateYmd(parseInt(m[3], 10), parseInt(m[2], 10), parseInt(m[1], 10));

    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return PtmController._formatDateYmd(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));

    m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{4})$/);
    if (m) {
      const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
      const mon = months[m[2].slice(0, 3).toLowerCase()];
      if (mon) return PtmController._formatDateYmd(parseInt(m[3], 10), mon, parseInt(m[1], 10));
    }
    return null;
  }

  static _matchMill(raw, mills) {
    if (!raw) return null;
    const s = String(raw).trim().toLowerCase();
    let found = mills.find((m) => m.name.toLowerCase() === s);
    if (found) return found;
    found = mills.find((m) => m.name.toLowerCase().includes(s) || s.includes(m.name.toLowerCase()));
    if (found) return found;
    const numMatch = s.match(/(\d+)/);
    if (numMatch) {
      const num = numMatch[1];
      found = mills.find((m) => {
        const mNum = m.name.match(/(\d+)/);
        return mNum && mNum[1] === num;
      });
      if (found) return found;
    }
    return null;
  }

  static _matchType(raw, types) {
    if (!raw) return null;
    const s = String(raw).trim().toLowerCase();
    let found = types.find((t) => t.name.toLowerCase() === s);
    if (found) return found;
    found = types.find((t) => t.name.toLowerCase().replace(/\s+/g, '') === s.replace(/\s+/g, ''));
    if (found) return found;
    found = types.find((t) => s.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(s));
    return found || null;
  }

  static async downloadBreakdownImportTemplate(req, res) {
    try {
      const ExcelJS = require('exceljs');
      const [millsRes, typesRes] = await Promise.all([
        query('SELECT name FROM ptm_mills WHERE is_active = true ORDER BY display_order'),
        query('SELECT name FROM ptm_breakdown_types WHERE is_active = true ORDER BY display_order'),
      ]);
      const millNames = millsRes.rows.map((r) => r.name);
      const typeNames = typesRes.rows.map((r) => r.name);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Breakdown Data');
      const headers = [
        'Date', 'Shift', 'Mill No.', 'Breakdown Type', 'Breakdown Reason',
        'Time Taken (min)', 'No. of Times Repeated', 'No. of Pipes Made',
        'Size', 'Thickness', 'Length (m)',
      ];
      sheet.addRow(headers);
      sheet.getRow(1).font = { bold: true };
      sheet.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(16, h.length + 2) }));

      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      sheet.addRow([
        `${dd}-${mm}-${today.getFullYear()}`, 'DAY', millNames[0] || 'Mill No. 1', typeNames[0] || 'Electrical',
        'Sample reason', 15, 2, 500, '10MM', '3.5MM', 6,
      ]);

      const help = workbook.addWorksheet('Instructions');
      help.addRow(['PTM Breakdown Report — Import Instructions']);
      help.getRow(1).font = { bold: true, size: 14 };
      help.addRow([]);
      help.addRow(['1. Fill data in "Breakdown Data" sheet — one row = one breakdown/production entry']);
      help.addRow(['2. Date: DD-MM-YYYY (e.g. 29-08-2026)']);
      help.addRow(['3. Shift: optional, free text (e.g. DAY, NIGHT, A, B, C)']);
      help.addRow([`4. Mill No.: one of — ${millNames.join(', ') || 'Mill No. 1, Mill No. 2, ...'}`]);
      help.addRow([`5. Breakdown Type: one of — ${typeNames.join(', ') || 'Electrical, Mechanical, Production, Roll Change'}`]);
      help.addRow(['6. Breakdown Reason: free text']);
      help.addRow(['7. Time Taken (min): number']);
      help.addRow(['8. No. of Times Repeated: optional number']);
      help.addRow(['9. No. of Pipes Made / Size / Thickness / Length: optional — fill when the row also records production']);
      help.addRow(['10. Multiple sizes/thicknesses run in one day: add one row per size/thickness change']);
      help.addRow(['11. Delete the sample row before importing']);
      help.getColumn(1).width = 90;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=PTM_Breakdown_Import_Template.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('PTM downloadBreakdownImportTemplate error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate template' });
    }
  }

  static async importBreakdownExcel(req, res) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: 'Excel file is required' });
      }

      const [millsRes, typesRes] = await Promise.all([
        query('SELECT id, name, display_order FROM ptm_mills WHERE is_active = true'),
        query('SELECT id, name FROM ptm_breakdown_types WHERE is_active = true'),
      ]);
      const mills = millsRes.rows;
      const types = typesRes.rows;
      const millOrder = {};
      mills.forEach((m) => { millOrder[m.name] = m.display_order; });

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);
      const sheet = workbook.getWorksheet('Breakdown Data') || workbook.worksheets[0];
      if (!sheet) return res.status(400).json({ success: false, message: 'No worksheet found in Excel file' });

      const headerRow = sheet.getRow(1);
      const headers = [];
      headerRow.eachCell({ includeEmpty: false }, (cell, colNum) => { headers[colNum] = String(cell.value || '').trim(); });

      const col = (name) => {
        const idx = headers.findIndex((h) => h && h.toLowerCase() === name.toLowerCase());
        return idx > 0 ? idx : null;
      };

      const map = {
        date: col('Date'),
        shift: col('Shift'),
        mill: col('Mill No.') || col('Mill'),
        type: col('Breakdown Type'),
        reason: col('Breakdown Reason'),
        minutes: col('Time Taken (min)') || col('Time Taken'),
        repeated: col('No. of Times Repeated'),
        pieces: col('No. of Pipes Made'),
        size: col('Size'),
        thickness: col('Thickness'),
        length: col('Length (m)') || col('Length'),
      };

      if (!map.date || !map.mill || !map.type) {
        return res.status(400).json({
          success: false,
          message: 'Excel must include Date, Mill No. and Breakdown Type columns (use the download template)',
        });
      }

      const cellVal = (row, c) => {
        if (!c) return null;
        const cell = row.getCell(c);
        const raw = PtmController._cellRaw(cell.value);
        if (raw != null && raw !== '') return raw;
        if (cell.text != null && String(cell.text).trim() !== '') return String(cell.text).trim();
        return null;
      };

      const previewVal = (v) => {
        if (v == null || v === '') return '(empty)';
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        const s = String(v).trim();
        return s.length > 40 ? `${s.slice(0, 40)}…` : s;
      };

      const nullIfEmpty = (v) => {
        if (v == null) return null;
        const s = String(v).trim();
        return s === '' ? null : s;
      };
      const toInt = (v) => {
        if (v == null || v === '') return null;
        const n = parseInt(v, 10);
        return Number.isNaN(n) ? null : n;
      };
      const toFloat = (v) => {
        if (v == null || v === '') return null;
        const n = parseFloat(v);
        return Number.isNaN(n) ? null : n;
      };

      const errors = [];
      const rows = [];

      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const anyData = headers.some((_, i) => {
          if (!i) return false;
          const v = cellVal(row, i);
          return v != null && String(v).trim() !== '';
        });
        if (!anyData) return;

        const rawDate = cellVal(row, map.date);
        const logDate = PtmController._parseExcelDate(rawDate);
        const rawMill = cellVal(row, map.mill);
        const mill = PtmController._matchMill(rawMill, mills);
        const rawType = cellVal(row, map.type);
        const type = PtmController._matchType(rawType, types);

        if (!logDate) {
          errors.push(`Row ${rowNumber}: invalid Date "${previewVal(rawDate)}" — use DD-MM-YYYY (e.g. 29-08-2026)`);
          return;
        }
        if (!mill) {
          errors.push(`Row ${rowNumber}: unknown Mill "${previewVal(rawMill)}" — must match ${mills.map((m) => m.name).join(', ')}`);
          return;
        }
        if (!type) {
          errors.push(`Row ${rowNumber}: unknown Breakdown Type "${previewVal(rawType)}" — must match ${types.map((t) => t.name).join(', ')}`);
          return;
        }

        rows.push({
          log_date: logDate,
          mill_name: mill.name,
          shift: nullIfEmpty(cellVal(row, map.shift)),
          breakdown_type: type.name,
          breakdown_reason: nullIfEmpty(cellVal(row, map.reason)),
          breakdown_minutes: toInt(cellVal(row, map.minutes)) || 0,
          repeated_count: toInt(cellVal(row, map.repeated)),
          pipe_pieces: toInt(cellVal(row, map.pieces)),
          size: nullIfEmpty(cellVal(row, map.size)),
          thickness: nullIfEmpty(cellVal(row, map.thickness)),
          pipe_length_m: toFloat(cellVal(row, map.length)),
        });
      });

      if (!rows.length) {
        return res.status(400).json({
          success: false,
          message: errors.length ? `No valid rows to import. ${errors.slice(0, 5).join('; ')}` : 'No data rows found in Excel',
          errors,
        });
      }

      let imported = 0;
      await transaction(async (client) => {
        const logIdByDate = {};
        const slotIdByKey = {};

        for (const r of rows) {
          let logId = logIdByDate[r.log_date];
          if (!logId) {
            const existing = await client.query('SELECT id FROM ptm_breakdown_logs WHERE log_date = $1', [r.log_date]);
            if (existing.rows.length) {
              logId = existing.rows[0].id;
            } else {
              const ins = await client.query(
                'INSERT INTO ptm_breakdown_logs (log_date, filled_by) VALUES ($1,$2) RETURNING id',
                [r.log_date, req.user.id]
              );
              logId = ins.rows[0].id;
            }
            logIdByDate[r.log_date] = logId;
          }

          const slotKey = `${r.log_date}||${r.mill_name}`;
          let slotId = slotIdByKey[slotKey];
          if (!slotId) {
            const existingSlot = await client.query(
              'SELECT id FROM ptm_breakdown_slots WHERE log_id = $1 AND slot_label = $2',
              [logId, r.mill_name]
            );
            if (existingSlot.rows.length) {
              slotId = existingSlot.rows[0].id;
            } else {
              const insSlot = await client.query(
                'INSERT INTO ptm_breakdown_slots (log_id, slot_label, slot_order) VALUES ($1,$2,$3) RETURNING id',
                [logId, r.mill_name, millOrder[r.mill_name] || 0]
              );
              slotId = insSlot.rows[0].id;
            }
            slotIdByKey[slotKey] = slotId;
          }

          await client.query(
            `INSERT INTO ptm_breakdown_entries
               (slot_id, breakdown_type, breakdown_minutes, breakdown_reason, repeated_count, shift, size, thickness, pipe_pieces, pipe_length_m)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [slotId, r.breakdown_type, r.breakdown_minutes, r.breakdown_reason, r.repeated_count,
              r.shift, r.size, r.thickness, r.pipe_pieces, r.pipe_length_m]
          );
          imported += 1;
        }
      });

      res.json({
        success: true,
        message: `Imported ${imported} breakdown entr${imported === 1 ? 'y' : 'ies'}`,
        data: { imported, skipped_errors: errors.length, errors: errors.slice(0, 20) },
      });
    } catch (error) {
      console.error('PTM importBreakdownExcel error:', error);
      res.status(500).json({ success: false, message: 'Failed to import Excel file' });
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

  static async getBreakdownAnalytics(req, res) {
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const defaultFrom = `${y}-${String(m).padStart(2, '0')}-01`;
      const defaultTo = new Date(y, m, 0).toISOString().slice(0, 10);
      const { date_from, date_to, mill } = req.query;
      const dateFrom = date_from || defaultFrom;
      const dateTo = date_to || defaultTo;

      const params = [dateFrom, dateTo];
      let millFilter = '';
      if (mill) { params.push(mill); millFilter = `AND bs.slot_label = $${params.length}`; }

      const result = await query(
        `SELECT bl.log_date, bs.id AS slot_id, bs.slot_label, bs.pipe_pieces, bs.pipe_length_m, bs.total_minutes,
                be.breakdown_type, be.breakdown_minutes, be.breakdown_reason, be.repeated_count
         FROM ptm_breakdown_logs bl
         JOIN ptm_breakdown_slots bs ON bs.log_id = bl.id
         LEFT JOIN ptm_breakdown_entries be ON be.slot_id = bs.id
         WHERE bl.log_date BETWEEN $1 AND $2 ${millFilter}
         ORDER BY bl.log_date, bs.slot_order`,
        params
      );
      const rows = result.rows;

      // One entry per mill-per-day slot (for capacity/pieces/speed — independent of breakdown type)
      const slotMap = new Map();
      rows.forEach(r => {
        if (!slotMap.has(r.slot_id)) {
          slotMap.set(r.slot_id, {
            slot_label: r.slot_label,
            pipe_pieces: parseInt(r.pipe_pieces) || 0,
            pipe_length_m: parseFloat(r.pipe_length_m) || 6,
            total_minutes: parseInt(r.total_minutes) || 1440,
          });
        }
      });

      const millStats = {};
      slotMap.forEach(slot => {
        if (!millStats[slot.slot_label]) {
          millStats[slot.slot_label] = {
            slot_label: slot.slot_label, days: 0, capacity_minutes: 0, breakdown_minutes: 0,
            total_pieces: 0, total_meters: 0, roll_change_count: 0, roll_change_minutes: 0,
            sizes: new Set(),
          };
        }
        const ms = millStats[slot.slot_label];
        ms.days += 1;
        ms.capacity_minutes += slot.total_minutes;
        ms.total_pieces += slot.pipe_pieces;
        ms.total_meters += slot.pipe_pieces * slot.pipe_length_m;
      });

      const typeAgg = {};
      const reasonAgg = {};
      const trendAgg = {};
      let totalBreakdownMinutes = 0;

      rows.forEach(r => {
        if (!r.breakdown_type) return;
        const minutes = parseInt(r.breakdown_minutes) || 0;
        totalBreakdownMinutes += minutes;

        const ms = millStats[r.slot_label];
        if (ms) ms.breakdown_minutes += minutes;

        typeAgg[r.breakdown_type] = (typeAgg[r.breakdown_type] || 0) + minutes;

        trendAgg[r.log_date] = (trendAgg[r.log_date] || 0) + minutes;

        if (r.breakdown_reason) {
          const key = `${r.breakdown_type}||${r.breakdown_reason}`;
          if (!reasonAgg[key]) reasonAgg[key] = { breakdown_type: r.breakdown_type, reason: r.breakdown_reason, count: 0, minutes: 0 };
          reasonAgg[key].count += parseInt(r.repeated_count) || 1;
          reasonAgg[key].minutes += minutes;
        }

        if (ms && r.breakdown_type.toLowerCase().includes('roll') && r.breakdown_reason) {
          ms.roll_change_count += 1;
          ms.roll_change_minutes += minutes;
          const sizeMatch = r.breakdown_reason.match(/(.+?)\s*(?:→|->)\s*(.+)/);
          if (sizeMatch) { ms.sizes.add(sizeMatch[1].trim()); ms.sizes.add(sizeMatch[2].trim()); }
          else ms.sizes.add(r.breakdown_reason.trim());
        }
      });

      const byMill = Object.values(millStats).map(ms => {
        const running_minutes = ms.capacity_minutes - ms.breakdown_minutes;
        const efficiency_pct = ms.capacity_minutes > 0 ? +(running_minutes / ms.capacity_minutes * 100).toFixed(1) : 0;
        const avg_speed_m_per_min = running_minutes > 0 && ms.total_meters > 0 ? +(ms.total_meters / running_minutes).toFixed(2) : null;
        return {
          slot_label: ms.slot_label,
          days: ms.days,
          capacity_minutes: ms.capacity_minutes,
          breakdown_minutes: ms.breakdown_minutes,
          running_minutes,
          efficiency_pct,
          total_pieces: ms.total_pieces,
          total_meters: +ms.total_meters.toFixed(1),
          avg_speed_m_per_min,
          sizes_run: Array.from(ms.sizes),
          roll_change_count: ms.roll_change_count,
          roll_change_minutes: ms.roll_change_minutes,
        };
      }).sort((a, b) => a.slot_label.localeCompare(b.slot_label));

      const totalCapacity = byMill.reduce((s, mstat) => s + mstat.capacity_minutes, 0);
      const totalRunning = totalCapacity - totalBreakdownMinutes;

      const byType = Object.entries(typeAgg).map(([type, minutes]) => ({
        breakdown_type: type,
        minutes,
        pct: totalBreakdownMinutes > 0 ? +(minutes / totalBreakdownMinutes * 100).toFixed(1) : 0,
      })).sort((a, b) => b.minutes - a.minutes);

      const reasons = Object.values(reasonAgg).map(r => ({
        ...r,
        pct: totalBreakdownMinutes > 0 ? +(r.minutes / totalBreakdownMinutes * 100).toFixed(1) : 0,
      })).sort((a, b) => b.minutes - a.minutes);

      const mostRepeated = reasons.length ? [...reasons].sort((a, b) => b.count - a.count)[0] : null;

      const trend = Object.entries(trendAgg)
        .map(([log_date, minutes]) => ({ log_date, minutes }))
        .sort((a, b) => a.log_date.localeCompare(b.log_date));

      res.json({
        success: true,
        data: {
          date_from: dateFrom,
          date_to: dateTo,
          summary: {
            capacity_minutes: totalCapacity,
            breakdown_minutes: totalBreakdownMinutes,
            running_minutes: totalRunning,
            uptime_pct: totalCapacity > 0 ? +(totalRunning / totalCapacity * 100).toFixed(1) : 0,
          },
          byMill,
          byType,
          reasons,
          mostRepeated,
          topReasons: reasons.slice(0, 5),
          trend,
        },
      });
    } catch (error) {
      console.error('PTM getBreakdownAnalytics error:', error);
      res.status(500).json({ success: false, message: 'Failed to compute breakdown analytics' });
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
