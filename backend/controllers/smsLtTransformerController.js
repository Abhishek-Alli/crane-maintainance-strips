const { query } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const { LT_TRANSFORMERS, nullIfEmpty, parseNumber, normalizeChecks } = require('../utils/smsLtTransformerConfig');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates the body. Returns { error } or { values } */
function prepare(b) {
  if (!ISO_DATE.test(b.report_date || '')) return { error: 'Date is required' };
  const recordedBy = nullIfEmpty(b.recorded_by);
  if (!recordedBy) return { error: 'Recorded By is required' };

  const transformer = nullIfEmpty(b.transformer);
  if (transformer && !LT_TRANSFORMERS.includes(transformer)) return { error: 'Invalid transformer' };

  const oti = parseNumber(b.oti_temperature);
  const wti = parseNumber(b.wti_temperature);
  if (Number.isNaN(oti) || Number.isNaN(wti)) return { error: 'Temperatures must be numbers' };

  return {
    values: [
      b.report_date, recordedBy, transformer,
      JSON.stringify(normalizeChecks(b.checks)),
      oti, nullIfEmpty(b.oti_remark),
      wti, nullIfEmpty(b.wti_remark),
      nullIfEmpty(b.remark),
    ],
  };
}

class SmsLtTransformerController {
  static async getLogs(req, res) {
    try {
      const { date_from, date_to, limit } = req.query;
      const conditions = [];
      const params = [];

      if (date_from) {
        params.push(date_from);
        conditions.push(`l.report_date >= $${params.length}::date`);
      }
      if (date_to) {
        params.push(date_to);
        conditions.push(`l.report_date <= $${params.length}::date`);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const parsedLimit = parseInt(limit, 10);
      const rowLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 5000)
        : (date_from || date_to ? 2000 : 200);
      params.push(rowLimit);

      const result = await query(
        `SELECT l.id, l.report_date, l.recorded_by, l.transformer, l.checks,
                l.oti_temperature, l.wti_temperature, l.created_at,
                u.username AS filled_by_name
         FROM sms_lt_transformer_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_lt_transformer_checklists l ${whereClause}`,
        params.slice(0, -1)
      );

      res.json({
        success: true,
        data: result.rows,
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('SMS LT Transformer getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch LT transformer checklists' });
    }
  }

  static async getById(req, res) {
    try {
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_lt_transformer_checklists l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [req.params.id]
      );
      const log = result.rows[0];
      if (!log) return res.status(404).json({ success: false, message: 'LT transformer checklist not found' });
      res.json({ success: true, data: { ...log, can_modify: isWithinEditWindow(log.created_at) } });
    } catch (error) {
      console.error('SMS LT Transformer getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch LT transformer checklist' });
    }
  }

  static async create(req, res) {
    try {
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `INSERT INTO sms_lt_transformer_checklists (
           report_date, recorded_by, transformer, checks,
           oti_temperature, oti_remark, wti_temperature, wti_remark, remark, filled_by
         ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [...prep.values, req.user.id]
      );
      res.status(201).json({ success: true, message: 'LT transformer checklist saved', data: result.rows[0] });
    } catch (error) {
      console.error('SMS LT Transformer create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save LT transformer checklist' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_lt_transformer_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'LT transformer checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `UPDATE sms_lt_transformer_checklists SET
           report_date = $1, recorded_by = $2, transformer = $3, checks = $4::jsonb,
           oti_temperature = $5, oti_remark = $6, wti_temperature = $7, wti_remark = $8, remark = $9,
           updated_at = NOW()
         WHERE id = $10
         RETURNING id`,
        [...prep.values, id]
      );
      res.json({ success: true, message: 'LT transformer checklist updated', data: result.rows[0] });
    } catch (error) {
      console.error('SMS LT Transformer update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update LT transformer checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_lt_transformer_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'LT transformer checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      await query(`DELETE FROM sms_lt_transformer_checklists WHERE id = $1`, [id]);
      res.json({ success: true, message: 'LT transformer checklist deleted' });
    } catch (error) {
      console.error('SMS LT Transformer delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete LT transformer checklist' });
    }
  }
}

module.exports = SmsLtTransformerController;
