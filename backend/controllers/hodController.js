const { query } = require('../config/database');

// Registry of all sheets available for HOD review, grouped by module.
const HOD_SHEETS = {
  HSM_CHECKSHEETS: [
    { key: 'fm-daily-checklist',   label: 'FM Daily Check List' },
    { key: 'delay-report',         label: 'Delay Report' },
    { key: 'breakdown-analysis',   label: 'Breakdown Analysis' },
    { key: 'roll-change-activity', label: 'Roll Change Activity' },
  ],
  HBM_CHECKSHEETS: [
    { key: 'dc-motor',         label: 'DC Motor' },
    { key: 'rolling-stand',    label: 'Rolling Stand' },
    { key: 'mill-mech',        label: 'Mill Mechanical' },
    { key: 'cooling-bed',      label: 'Cooling Bed' },
    { key: 'pumphouse',        label: 'Pumphouse' },
    { key: 'bar-bundle',       label: 'Bar Bundle Area' },
    { key: 'before-rolling',   label: 'Before Rolling' },
    { key: 'pump-param',       label: 'Pump Parameter Report' },
    { key: 'water-param',      label: 'Water Parameters' },
    { key: 'ph-maint',         label: 'PH Maintenance' },
    { key: 'transformer',      label: 'HBM Transformer' },
    { key: 'oil-level',        label: 'Daily Oil Level' },
    { key: 'dc-motor-airflow', label: 'DC Motor Airflow Report' },
    { key: 'roughing-gb-temp', label: 'Roughing Stand & GB Bearing Temp' },
    { key: 'breakdown',        label: 'HBM Breakdown Report' },
  ],
  SMS_CHECKSHEETS: [
    { key: 'breakdown-analysis', label: 'Breakdown Analysis Report' },
  ],
  PTM_CHECKSHEETS: [
    { key: 'checksheet',  label: 'PTM Checksheet' },
    { key: 'breakdown',   label: 'PTM Breakdown Report' },
  ],
};

function isAdmin(user) {
  const role = (user.role_name || user.role || '').toUpperCase();
  const userType = (user.user_type || '').toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || userType === 'ADMIN';
}

/** Load a user's allowed_scope; null means "all allowed". */
async function loadScope(userId) {
  const result = await query(
    'SELECT allowed_scope FROM hod_user_permissions WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].allowed_scope; // JSONB (object) or null
}

/** True if the given user may view sheetKey within moduleCode. */
function scopeAllows(scope, moduleCode, sheetKey) {
  if (scope == null) return true;                          // null scope = all allowed
  if (!(moduleCode in scope)) return false;                // module not granted at all
  const sheets = scope[moduleCode];
  if (sheets === null) return true;                        // module fully allowed
  return Array.isArray(sheets) && sheets.includes(sheetKey);
}

class HodController {
  /** GET /api/hod/scope — the current HOD's allowed sheets, resolved to labels. */
  static async getMyScope(req, res) {
    try {
      const admin = isAdmin(req.user);
      const scope = admin ? null : await loadScope(req.user.id);
      const modules = Object.entries(HOD_SHEETS).map(([moduleCode, sheets]) => ({
        module_code: moduleCode,
        sheets: sheets.filter((s) => scopeAllows(scope, moduleCode, s.key)),
      })).filter((m) => m.sheets.length > 0);

      res.json({ success: true, data: { modules, is_admin: admin } });
    } catch (error) {
      console.error('HOD getMyScope error:', error);
      res.status(500).json({ success: false, message: 'Failed to load HOD scope' });
    }
  }

  /**
   * GET /api/hod/signoffs?sheet=fm-daily-checklist
   * Returns all sign-offs for a sheet (or every sheet if no filter).
   */
  static async getSignoffs(req, res) {
    try {
      const { sheet, module } = req.query;
      const params = [];
      const conditions = [];
      if (module) {
        params.push(module);
        conditions.push(`module_code = $${params.length}`);
      }
      if (sheet) {
        params.push(sheet);
        conditions.push(`sheet_key = $${params.length}`);
      }
      const where = conditions.length > 0 ? conditions.join(' AND ') : 'TRUE';
      const result = await query(
        `SELECT sheet_key, record_id, seen_by, seen_by_name, seen_at, remark
         FROM hsm_hod_signoffs WHERE ${where}`,
        params
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('HOD getSignoffs error:', error);
      res.status(500).json({ success: false, message: 'Failed to load sign-offs' });
    }
  }

  /**
   * POST /api/hod/signoff
   * Body: { sheet_key, record_id, remark, module_code? }
   * Upserts a "seen by HOD" record. HOD-only write action.
   */
  static async upsertSignoff(req, res) {
    try {
      const { sheet_key, record_id, remark } = req.body || {};
      const moduleCode = req.body?.module_code || 'HSM_CHECKSHEETS';
      if (!sheet_key || !record_id) {
        return res.status(400).json({ success: false, message: 'sheet_key and record_id are required' });
      }

      // Enforce scope (admins bypass).
      if (!isAdmin(req.user)) {
        const scope = await loadScope(req.user.id);
        if (!scopeAllows(scope, moduleCode, sheet_key)) {
          return res.status(403).json({ success: false, message: 'Not authorized for this sheet' });
        }
      }

      const result = await query(
        `INSERT INTO hsm_hod_signoffs (module_code, sheet_key, record_id, seen_by, seen_by_name, seen_at, remark)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         ON CONFLICT (module_code, sheet_key, record_id) DO UPDATE SET
           seen_by      = EXCLUDED.seen_by,
           seen_by_name = EXCLUDED.seen_by_name,
           seen_at      = NOW(),
           remark       = EXCLUDED.remark
         RETURNING sheet_key, record_id, seen_by, seen_by_name, seen_at, remark`,
        [moduleCode, sheet_key, record_id, req.user.id, req.user.username, remark || null]
      );

      res.json({ success: true, message: 'Marked as seen by HOD', data: result.rows[0] });
    } catch (error) {
      console.error('HOD upsertSignoff error:', error);
      res.status(500).json({ success: false, message: 'Failed to save sign-off' });
    }
  }

  /** Express middleware factory: guard a route by HSM sheet scope. */
  static requireScope(sheetKey, moduleCode = 'HSM_CHECKSHEETS') {
    return async (req, res, next) => {
      try {
        if (isAdmin(req.user)) return next();
        const scope = await loadScope(req.user.id);
        if (scopeAllows(scope, moduleCode, sheetKey)) return next();
        return res.status(403).json({ success: false, message: 'Not authorized for this sheet' });
      } catch (error) {
        console.error('HOD requireScope error:', error);
        return res.status(500).json({ success: false, message: 'Scope check failed' });
      }
    };
  }
}

HodController.HOD_SHEETS = HOD_SHEETS;
module.exports = HodController;
