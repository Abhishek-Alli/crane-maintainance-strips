const { query } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');

// Keep in sync with frontend/src/components/sms/dgConfig.js
const DIESEL_REFILL_OPTIONS = ['YES', 'NO'];
const AIR_CLEANING_OPTIONS = ['DONE', 'PREVIOUSLY DONE'];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const nullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** Validates the body. Returns { error } or { values } */
function prepare(b) {
  if (!ISO_DATE.test(b.report_date || '')) return { error: 'Date is required' };
  const recordedBy = nullIfEmpty(b.recorded_by);
  if (!recordedBy) return { error: 'Recorded By is required' };

  const diesel = nullIfEmpty(b.diesel_refill);
  if (diesel && !DIESEL_REFILL_OPTIONS.includes(diesel)) return { error: 'Invalid Diesel Refill value' };
  const air = nullIfEmpty(b.air_cleaning);
  if (air && !AIR_CLEANING_OPTIONS.includes(air)) return { error: 'Invalid Air Cleaning value' };

  const hoursRaw = nullIfEmpty(b.running_hours);
  const hours = hoursRaw === null ? null : Number(hoursRaw);
  if (hours !== null && !Number.isFinite(hours)) return { error: 'Running Hours must be a number' };

  return {
    values: [
      b.report_date, recordedBy,
      diesel, nullIfEmpty(b.diesel_refill_remark),
      air,
      hours, nullIfEmpty(b.running_hours_remark),
      nullIfEmpty(b.remark),
    ],
  };
}

class SmsDgController {
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
        `SELECT l.id, l.report_date, l.recorded_by, l.diesel_refill, l.air_cleaning,
                l.running_hours, l.created_at, u.username AS filled_by_name
         FROM sms_dg_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_dg_checklists l ${whereClause}`,
        params.slice(0, -1)
      );

      res.json({
        success: true,
        data: result.rows,
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('SMS DG getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch DG checklists' });
    }
  }

  static async getById(req, res) {
    try {
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_dg_checklists l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [req.params.id]
      );
      const log = result.rows[0];
      if (!log) return res.status(404).json({ success: false, message: 'DG checklist not found' });
      res.json({ success: true, data: { ...log, can_modify: isWithinEditWindow(log.created_at) } });
    } catch (error) {
      console.error('SMS DG getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch DG checklist' });
    }
  }

  static async create(req, res) {
    try {
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `INSERT INTO sms_dg_checklists (
           report_date, recorded_by, diesel_refill, diesel_refill_remark, air_cleaning,
           running_hours, running_hours_remark, remark, filled_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [...prep.values, req.user.id]
      );
      res.status(201).json({ success: true, message: 'DG checklist saved', data: result.rows[0] });
    } catch (error) {
      console.error('SMS DG create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save DG checklist' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_dg_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) return res.status(404).json({ success: false, message: 'DG checklist not found' });
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `UPDATE sms_dg_checklists SET
           report_date = $1, recorded_by = $2, diesel_refill = $3, diesel_refill_remark = $4,
           air_cleaning = $5, running_hours = $6, running_hours_remark = $7, remark = $8,
           updated_at = NOW()
         WHERE id = $9
         RETURNING id`,
        [...prep.values, id]
      );
      res.json({ success: true, message: 'DG checklist updated', data: result.rows[0] });
    } catch (error) {
      console.error('SMS DG update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update DG checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_dg_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) return res.status(404).json({ success: false, message: 'DG checklist not found' });
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      await query(`DELETE FROM sms_dg_checklists WHERE id = $1`, [id]);
      res.json({ success: true, message: 'DG checklist deleted' });
    } catch (error) {
      console.error('SMS DG delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete DG checklist' });
    }
  }
}

module.exports = SmsDgController;
