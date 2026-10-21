const { query } = require('../config/database');
const { isWithinEditWindow, editWindowDeniedMessage } = require('../utils/editWindow');
const { findCrane } = require('../utils/smsEotCraneConfig');
const {
  DATETIME, nullIfEmpty, normalizeSkipped, normalizeItems,
} = require('../utils/smsEotCraneElectricalConfig');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates the body. Returns { error } or { values } */
function prepare(b) {
  if (!ISO_DATE.test(b.report_date || '')) return { error: 'Date is required' };
  const recordedBy = nullIfEmpty(b.recorded_by);
  if (!recordedBy) return { error: 'Recorded By is required' };

  const shed = nullIfEmpty(b.shed_name);
  const craneNumber = nullIfEmpty(b.crane_number);
  if (!shed || !craneNumber) return { error: 'Crane is required' };
  if (!findCrane(shed, craneNumber)) return { error: 'Invalid crane' };

  const start = nullIfEmpty(b.maintenance_start);
  const end = nullIfEmpty(b.maintenance_end);
  if (!start || !DATETIME.test(start)) return { error: 'Maintenance Start date & time is required' };
  if (!end || !DATETIME.test(end)) return { error: 'Maintenance End date & time is required' };
  if (end < start) return { error: 'Maintenance End must be after Maintenance Start' };

  const skipped = normalizeSkipped(b.skipped_sections);
  const norm = normalizeItems(b.items, skipped);
  if (norm.error) return { error: norm.error };

  return {
    values: [
      b.report_date, recordedBy, shed, craneNumber,
      JSON.stringify(norm.items), JSON.stringify(skipped),
      nullIfEmpty(b.remark), start, end,
    ],
  };
}

class SmsEotCraneElectricalController {
  static async getLogs(req, res) {
    try {
      const { date_from, date_to, shed_name, crane_number, limit } = req.query;
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
      if (shed_name) {
        params.push(String(shed_name));
        conditions.push(`l.shed_name = $${params.length}`);
      }
      if (crane_number) {
        params.push(String(crane_number));
        conditions.push(`l.crane_number = $${params.length}`);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const parsedLimit = parseInt(limit, 10);
      const rowLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 5000)
        : (date_from || date_to ? 2000 : 200);
      params.push(rowLimit);

      const result = await query(
        `SELECT l.id, l.report_date, l.recorded_by, l.shed_name, l.crane_number, l.items,
                l.skipped_sections, l.maintenance_start, l.maintenance_end, l.created_at,
                u.username AS filled_by_name
         FROM sms_eot_crane_electrical_checklists l
         JOIN users u ON l.filled_by = u.id
         ${whereClause}
         ORDER BY l.report_date DESC, l.created_at DESC
         LIMIT $${params.length}`,
        params
      );
      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM sms_eot_crane_electrical_checklists l ${whereClause}`,
        params.slice(0, -1)
      );

      res.json({
        success: true,
        data: result.rows,
        total: countResult.rows[0]?.total ?? result.rows.length,
        limit: rowLimit,
      });
    } catch (error) {
      console.error('SMS EOT Crane Electrical getLogs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch EOT crane electrical checklists' });
    }
  }

  static async getById(req, res) {
    try {
      const result = await query(
        `SELECT l.*, u.username AS filled_by_name
         FROM sms_eot_crane_electrical_checklists l
         JOIN users u ON l.filled_by = u.id
         WHERE l.id = $1`,
        [req.params.id]
      );
      const log = result.rows[0];
      if (!log) return res.status(404).json({ success: false, message: 'EOT crane electrical checklist not found' });
      res.json({ success: true, data: { ...log, can_modify: isWithinEditWindow(log.created_at) } });
    } catch (error) {
      console.error('SMS EOT Crane Electrical getById error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch EOT crane electrical checklist' });
    }
  }

  static async create(req, res) {
    try {
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `INSERT INTO sms_eot_crane_electrical_checklists (
           report_date, recorded_by, shed_name, crane_number, items, skipped_sections, remark,
           maintenance_start, maintenance_end, filled_by
         ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10)
         RETURNING id`,
        [...prep.values, req.user.id]
      );
      res.status(201).json({ success: true, message: 'EOT crane electrical checklist saved', data: result.rows[0] });
    } catch (error) {
      console.error('SMS EOT Crane Electrical create error:', error);
      res.status(500).json({ success: false, message: 'Failed to save EOT crane electrical checklist' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_eot_crane_electrical_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'EOT crane electrical checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      const prep = prepare(req.body || {});
      if (prep.error) return res.status(400).json({ success: false, message: prep.error });
      const result = await query(
        `UPDATE sms_eot_crane_electrical_checklists SET
           report_date = $1, recorded_by = $2, shed_name = $3, crane_number = $4,
           items = $5::jsonb, skipped_sections = $6::jsonb, remark = $7,
           maintenance_start = $8, maintenance_end = $9, updated_at = NOW()
         WHERE id = $10
         RETURNING id`,
        [...prep.values, id]
      );
      res.json({ success: true, message: 'EOT crane electrical checklist updated', data: result.rows[0] });
    } catch (error) {
      console.error('SMS EOT Crane Electrical update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update EOT crane electrical checklist' });
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params;
      const existing = await query(`SELECT id, created_at FROM sms_eot_crane_electrical_checklists WHERE id = $1`, [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'EOT crane electrical checklist not found' });
      }
      if (!isWithinEditWindow(existing.rows[0].created_at)) {
        return res.status(403).json({ success: false, message: editWindowDeniedMessage() });
      }
      await query(`DELETE FROM sms_eot_crane_electrical_checklists WHERE id = $1`, [id]);
      res.json({ success: true, message: 'EOT crane electrical checklist deleted' });
    } catch (error) {
      console.error('SMS EOT Crane Electrical delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete EOT crane electrical checklist' });
    }
  }
}

module.exports = SmsEotCraneElectricalController;
