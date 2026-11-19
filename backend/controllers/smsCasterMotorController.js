const { query } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const { CASTER_SHEETS, nullIfEmpty, normalizeReadings } = require('../utils/smsCasterMotorConfig');
const { notifyCasterMotorSheet } = require('../utils/telegramSmsNotify');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Resolves :sheet from the URL; sends 404 and returns null for unknown sheets */
function getSheet(req, res) {
  const sheet = CASTER_SHEETS[req.params.sheet];
  if (!sheet) {
    res.status(404).json({ success: false, message: 'Unknown caster sheet' });
    return null;
  }
  return sheet;
}

/** Returns { error } or { values } */
function prepare(sheet, b) {
  if (!ISO_DATE.test(b.report_date || '')) return { error: 'Date is required' };
  const recordedBy = nullIfEmpty(b.recorded_by);
  if (!recordedBy) return { error: 'Recorded By is required' };
  const norm = normalizeReadings(sheet, b.readings);
  if (norm.error) return { error: norm.error };
  if (!Object.values(norm.readings).some((r) => r.value !== null)) {
    return { error: 'Enter at least one motor current' };
  }
  const remark = nullIfEmpty(b.remark);
  return {
    values: [b.report_date, recordedBy, JSON.stringify(norm.readings), remark],
    data: { report_date: b.report_date, recorded_by: recordedBy, readings: norm.readings, remark },
  };
}

class SmsCasterMotorController {
  static async getLogs(req, res) {
    try {
      const sheet = getSheet(req, res);
      if (!sheet) return;
      const { date_from, date_to, limit } = req.query;
      const params = [req.params.sheet];
      const conditions = ['l.sheet = $1'];
      if (date_from) {
        params.push(date_from);
        conditions.push(`l.report_date >= $${params.length}::date`);
      }
      if (date_to) {
        params.push(date_to);
        conditions.push(`l.report_date <= $${params.length}::date`);
      }
      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const parsedLimit = parseInt(limit, 10);
      const rowLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 5000)
        : (date_from || date_to ? 2000 : 200);
      const listParams = [...params, rowLimit];

      const result = await query(
        `SELECT l.id, l.report_date, l.recorded_by, l.readings, l.remark, l.created_at,
                u.username AS filled_by_name
         FROM sms_caster_motor_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${listParams.length}`,
        listParams
      );
      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_caster_motor_checklists l ${whereClause}`,
        params
      );
      res.json({
        success: true,
        data: result.rows,
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('SMS Caster Motor getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch caster motor checklists' });
    }
  }

  static async getById(req, res) {
    try {
      if (!getSheet(req, res)) return;
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_caster_motor_checklists l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1 AND l.sheet = $2`,
        [req.params.id, req.params.sheet]
      );
      const log = result.rows[0];
      if (!log) return res.status(404).json({ success: false, message: 'Checklist not found' });
      res.json({ success: true, data: { ...log, can_modify: isWithinEditWindow(log.created_at) } });
    } catch (error) {
      console.error('SMS Caster Motor getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch caster motor checklist' });
    }
  }

  static async create(req, res) {
    try {
      const sheet = getSheet(req, res);
      if (!sheet) return;
      const prep = prepare(sheet, req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `INSERT INTO sms_caster_motor_checklists (sheet, report_date, recorded_by, readings, remark, filled_by)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6)
         RETURNING id`,
        [req.params.sheet, ...prep.values, req.user.id]
      );
      res.status(201).json({ success: true, message: 'Checklist saved', data: result.rows[0] });
      // Fire-and-forget: a Telegram failure must never affect the save
      notifyCasterMotorSheet({ sheetKey: req.params.sheet, sheet, data: prep.data, action: 'created', actorName: req.user.username });
    } catch (error) {
      console.error('SMS Caster Motor create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save caster motor checklist' });
    }
  }

  static async update(req, res) {
    try {
      const sheet = getSheet(req, res);
      if (!sheet) return;
      const { id } = req.params;
      const existing = await query(
        `SELECT id, created_at FROM sms_caster_motor_checklists WHERE id = $1 AND sheet = $2`,
        [id, req.params.sheet]
      );
      if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Checklist not found' });
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const prep = prepare(sheet, req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `UPDATE sms_caster_motor_checklists SET
           report_date = $1, recorded_by = $2, readings = $3::jsonb, remark = $4, updated_at = NOW()
         WHERE id = $5 AND sheet = $6
         RETURNING id`,
        [...prep.values, id, req.params.sheet]
      );
      res.json({ success: true, message: 'Checklist updated', data: result.rows[0] });
      notifyCasterMotorSheet({ sheetKey: req.params.sheet, sheet, data: prep.data, action: 'updated', actorName: req.user.username });
    } catch (error) {
      console.error('SMS Caster Motor update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update caster motor checklist' });
    }
  }

  static async remove(req, res) {
    try {
      if (!getSheet(req, res)) return;
      const { id } = req.params;
      const existing = await query(
        `SELECT id, created_at FROM sms_caster_motor_checklists WHERE id = $1 AND sheet = $2`,
        [id, req.params.sheet]
      );
      if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Checklist not found' });
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      await query(`DELETE FROM sms_caster_motor_checklists WHERE id = $1 AND sheet = $2`, [id, req.params.sheet]);
      res.json({ success: true, message: 'Checklist deleted' });
    } catch (error) {
      console.error('SMS Caster Motor delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete caster motor checklist' });
    }
  }
}

module.exports = SmsCasterMotorController;
