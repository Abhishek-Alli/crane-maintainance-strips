const { query } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const {
  FP_FURNACES, nullIfEmpty, parseNumber, normalizeChecks, normalizeCurrents,
} = require('../utils/smsFurnacePollutionConfig');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates the body. Returns { error } or { values } */
function prepare(b) {
  if (!ISO_DATE.test(b.report_date || '')) return { error: 'Date is required' };
  const recordedBy = nullIfEmpty(b.recorded_by);
  if (!recordedBy) return { error: 'Recorded By is required' };

  const furnace = nullIfEmpty(b.furnace);
  if (furnace && !FP_FURNACES.includes(furnace)) return { error: 'Invalid furnace' };

  const temperature = parseNumber(b.drive_temperature);
  if (Number.isNaN(temperature)) return { error: 'Drive Temperature must be a number' };

  const cur = normalizeCurrents(b.currents);
  if (cur.error) return { error: cur.error };

  return {
    values: [
      b.report_date, recordedBy, furnace,
      JSON.stringify(normalizeChecks(b.checks)),
      temperature, nullIfEmpty(b.drive_temperature_remark),
      JSON.stringify(cur.currents),
      nullIfEmpty(b.remark),
    ],
  };
}

class SmsFurnacePollutionController {
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
        `SELECT l.id, l.report_date, l.recorded_by, l.furnace, l.checks, l.drive_temperature, l.created_at,
                u.username AS filled_by_name
         FROM sms_furnace_pollution_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_furnace_pollution_checklists l ${whereClause}`,
        params.slice(0, -1)
      );

      res.json({
        success: true,
        data: result.rows,
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('SMS Furnace Pollution getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch furnace pollution checklists' });
    }
  }

  static async getById(req, res) {
    try {
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_furnace_pollution_checklists l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [req.params.id]
      );
      const log = result.rows[0];
      if (!log) return res.status(404).json({ success: false, message: 'Furnace pollution checklist not found' });
      res.json({ success: true, data: { ...log, can_modify: isWithinEditWindow(log.created_at) } });
    } catch (error) {
      console.error('SMS Furnace Pollution getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch furnace pollution checklist' });
    }
  }

  static async create(req, res) {
    try {
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `INSERT INTO sms_furnace_pollution_checklists (
           report_date, recorded_by, furnace, checks, drive_temperature, drive_temperature_remark,
           currents, remark, filled_by
         ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7::jsonb,$8,$9)
         RETURNING id`,
        [...prep.values, req.user.id]
      );
      res.status(201).json({ success: true, message: 'Furnace pollution checklist saved', data: result.rows[0] });
    } catch (error) {
      console.error('SMS Furnace Pollution create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save furnace pollution checklist' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_furnace_pollution_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Furnace pollution checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `UPDATE sms_furnace_pollution_checklists SET
           report_date = $1, recorded_by = $2, furnace = $3, checks = $4::jsonb,
           drive_temperature = $5, drive_temperature_remark = $6, currents = $7::jsonb, remark = $8,
           updated_at = NOW()
         WHERE id = $9
         RETURNING id`,
        [...prep.values, id]
      );
      res.json({ success: true, message: 'Furnace pollution checklist updated', data: result.rows[0] });
    } catch (error) {
      console.error('SMS Furnace Pollution update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update furnace pollution checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_furnace_pollution_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Furnace pollution checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      await query(`DELETE FROM sms_furnace_pollution_checklists WHERE id = $1`, [id]);
      res.json({ success: true, message: 'Furnace pollution checklist deleted' });
    } catch (error) {
      console.error('SMS Furnace Pollution delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete furnace pollution checklist' });
    }
  }
}

module.exports = SmsFurnacePollutionController;
