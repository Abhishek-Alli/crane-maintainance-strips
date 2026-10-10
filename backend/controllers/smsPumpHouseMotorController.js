const { query } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const { nullIfEmpty, parseCurrent, normalizeChecks } = require('../utils/smsPumpHouseMotorConfig');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const withAreaMotor = (row) => ({ ...row, area_motor: `${row.area} - ${row.motor}` });

/** Validates the body. Returns { error } or { values } */
function prepare(b) {
  if (!ISO_DATE.test(b.report_date || '')) return { error: 'Date is required' };
  const recordedBy = nullIfEmpty(b.recorded_by);
  if (!recordedBy) return { error: 'Recorded By is required' };
  const area = nullIfEmpty(b.area);
  if (!area) return { error: 'Area is required' };
  const motor = nullIfEmpty(b.motor);
  if (!motor) return { error: 'Motor is required' };

  const currents = [parseCurrent(b.current_r), parseCurrent(b.current_y), parseCurrent(b.current_b)];
  if (currents.some((c) => Number.isNaN(c))) return { error: 'Current values must be numbers' };

  return {
    values: [
      b.report_date, recordedBy, area, motor,
      ...currents,
      JSON.stringify(normalizeChecks(b.checks)),
      nullIfEmpty(b.remark),
    ],
  };
}

class SmsPumpHouseMotorController {
  static async getLogs(req, res) {
    try {
      const { date_from, date_to, area, limit } = req.query;
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
      if (area) {
        params.push(`%${String(area).trim()}%`);
        conditions.push(`l.area ILIKE $${params.length}`);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const parsedLimit = parseInt(limit, 10);
      const rowLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 5000)
        : (date_from || date_to ? 2000 : 200);
      params.push(rowLimit);

      const result = await query(
        `SELECT l.id, l.report_date, l.recorded_by, l.area, l.motor,
                l.current_r, l.current_y, l.current_b, l.checks, l.created_at,
                u.username AS filled_by_name
         FROM sms_pump_house_motor_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_pump_house_motor_checklists l ${whereClause}`,
        params.slice(0, -1)
      );

      res.json({
        success: true,
        data: result.rows.map(withAreaMotor),
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('SMS Pump House Motor getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch pump house motor checklists' });
    }
  }

  static async getById(req, res) {
    try {
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_pump_house_motor_checklists l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [req.params.id]
      );
      const log = result.rows[0];
      if (!log) return res.status(404).json({ success: false, message: 'Pump house motor checklist not found' });
      res.json({
        success: true,
        data: { ...withAreaMotor(log), can_modify: isWithinEditWindow(log.created_at) },
      });
    } catch (error) {
      console.error('SMS Pump House Motor getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch pump house motor checklist' });
    }
  }

  static async create(req, res) {
    try {
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `INSERT INTO sms_pump_house_motor_checklists (
           report_date, recorded_by, area, motor, current_r, current_y, current_b, checks, remark, filled_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)
         RETURNING id`,
        [...prep.values, req.user.id]
      );
      res.status(201).json({ success: true, message: 'Pump house motor checklist saved', data: result.rows[0] });
    } catch (error) {
      console.error('SMS Pump House Motor create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save pump house motor checklist' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_pump_house_motor_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Pump house motor checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `UPDATE sms_pump_house_motor_checklists SET
           report_date = $1, recorded_by = $2, area = $3, motor = $4,
           current_r = $5, current_y = $6, current_b = $7, checks = $8::jsonb, remark = $9,
           updated_at = NOW()
         WHERE id = $10
         RETURNING id`,
        [...prep.values, id]
      );
      res.json({ success: true, message: 'Pump house motor checklist updated', data: result.rows[0] });
    } catch (error) {
      console.error('SMS Pump House Motor update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update pump house motor checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_pump_house_motor_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Pump house motor checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      await query(`DELETE FROM sms_pump_house_motor_checklists WHERE id = $1`, [id]);
      res.json({ success: true, message: 'Pump house motor checklist deleted' });
    } catch (error) {
      console.error('SMS Pump House Motor delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete pump house motor checklist' });
    }
  }
}

module.exports = SmsPumpHouseMotorController;
