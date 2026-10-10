const { query } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const {
  FPK_FURNACES, FPK_CRUCIBLES, nullIfEmpty, normalizeChecks, normalizeCurrents,
} = require('../utils/smsFurnacePokerConfig');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates the body. Returns { error } or { values } */
function prepare(b) {
  if (!ISO_DATE.test(b.report_date || '')) return { error: 'Date is required' };
  const recordedBy = nullIfEmpty(b.recorded_by);
  if (!recordedBy) return { error: 'Recorded By is required' };

  const furnace = nullIfEmpty(b.furnace);
  if (furnace && !FPK_FURNACES.includes(furnace)) return { error: 'Invalid furnace' };
  const crucible = nullIfEmpty(b.crucible);
  if (crucible && !FPK_CRUCIBLES.includes(crucible)) return { error: 'Invalid crucible' };

  const cur = normalizeCurrents(b.currents);
  if (cur.error) return { error: cur.error };

  return {
    values: [
      b.report_date, recordedBy, furnace, crucible,
      JSON.stringify(normalizeChecks(b.checks)),
      JSON.stringify(cur.currents),
      nullIfEmpty(b.remark),
    ],
  };
}

class SmsFurnacePokerController {
  static async getLogs(req, res) {
    try {
      const { date_from, date_to, crucible, limit } = req.query;
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
      if (crucible) {
        params.push(String(crucible));
        conditions.push(`l.crucible = $${params.length}`);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const parsedLimit = parseInt(limit, 10);
      const rowLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 5000)
        : (date_from || date_to ? 2000 : 200);
      params.push(rowLimit);

      const result = await query(
        `SELECT l.id, l.report_date, l.recorded_by, l.furnace, l.crucible, l.checks, l.created_at,
                u.username AS filled_by_name
         FROM sms_furnace_poker_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_furnace_poker_checklists l ${whereClause}`,
        params.slice(0, -1)
      );

      res.json({
        success: true,
        data: result.rows,
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('SMS Furnace Poker getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch furnace poker checklists' });
    }
  }

  static async getById(req, res) {
    try {
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_furnace_poker_checklists l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [req.params.id]
      );
      const log = result.rows[0];
      if (!log) return res.status(404).json({ success: false, message: 'Furnace poker checklist not found' });
      res.json({ success: true, data: { ...log, can_modify: isWithinEditWindow(log.created_at) } });
    } catch (error) {
      console.error('SMS Furnace Poker getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch furnace poker checklist' });
    }
  }

  static async create(req, res) {
    try {
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `INSERT INTO sms_furnace_poker_checklists (
           report_date, recorded_by, furnace, crucible, checks, currents, remark, filled_by
         ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8)
         RETURNING id`,
        [...prep.values, req.user.id]
      );
      res.status(201).json({ success: true, message: 'Furnace poker checklist saved', data: result.rows[0] });
    } catch (error) {
      console.error('SMS Furnace Poker create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save furnace poker checklist' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_furnace_poker_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Furnace poker checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `UPDATE sms_furnace_poker_checklists SET
           report_date = $1, recorded_by = $2, furnace = $3, crucible = $4,
           checks = $5::jsonb, currents = $6::jsonb, remark = $7, updated_at = NOW()
         WHERE id = $8
         RETURNING id`,
        [...prep.values, id]
      );
      res.json({ success: true, message: 'Furnace poker checklist updated', data: result.rows[0] });
    } catch (error) {
      console.error('SMS Furnace Poker update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update furnace poker checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_furnace_poker_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Furnace poker checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      await query(`DELETE FROM sms_furnace_poker_checklists WHERE id = $1`, [id]);
      res.json({ success: true, message: 'Furnace poker checklist deleted' });
    } catch (error) {
      console.error('SMS Furnace Poker delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete furnace poker checklist' });
    }
  }
}

module.exports = SmsFurnacePokerController;
