// "Send Notifications for <date>" for everything except HBM (HBM has its own sender in hbmController):
//   - SMS sheets, including the motor-current sheets
//   - HSM sheets
//   - PTM sheets (latest checksheet per template, and breakdown)
//   - Crane inspections done that day
// For each sheet the LATEST entry of that date is sent with the normal new-entry message.
// Returns { sent: [...], skipped: [...], failed: [...] } — the same shape the HBM sender uses,
// so the Telegram settings screen can show both together.

const { query } = require('../config/database');
const { dispatch } = require('./telegramSmsGeneric');
const { notifyCasterMotorSheet } = require('./telegramSmsNotify');
const { tableInfo } = require('./telegramDeptSummary');
const {
  SMS_NOTIFY_REGISTRY,
  HSM_NOTIFY_REGISTRY,
  PTM_NOTIFY_REGISTRY,
} = require('./smsNotifyRegistry');
const { CASTER_SHEETS } = require('./smsCasterMotorConfig');

/** Id of the latest entry of `date` in `table`, or null */
async function latestIdForDate(table, date, extraWhere = '', extraParams = []) {
  const info = await tableInfo(table);
  if (!info) return null;
  const { rows } = await query(
    `SELECT l.id FROM ${table} l
     WHERE ${info.dateExpr} = $1 ${extraWhere ? `AND ${extraWhere}` : ''}
     ORDER BY ${info.hasCreated ? 'l.created_at' : 'l.id'} DESC LIMIT 1`,
    [date, ...extraParams]
  );
  return rows[0] ? rows[0].id : null;
}

async function sendDateNotifications(date, user) {
  const results = { sent: [], skipped: [], failed: [] };

  const run = async (label, fn) => {
    try {
      const outcome = await fn();
      if (outcome === 'skipped') results.skipped.push(label);
      else if (outcome === false) results.failed.push(label);
      else results.sent.push(label);
    } catch (e) {
      console.error(`Date notification error [${label}]:`, e.message);
      results.failed.push(label);
    }
  };

  // Registry-driven sheets (SMS, HSM, PTM breakdown): one message for the day's latest entry
  const registrySheets = [
    ['SMS', SMS_NOTIFY_REGISTRY],
    ['HSM', HSM_NOTIFY_REGISTRY],
    ['PTM', { breakdown: PTM_NOTIFY_REGISTRY.breakdown }],
  ];
  for (const [dept, registry] of registrySheets) {
    const seen = new Set();
    for (const entry of Object.values(registry)) {
      if (seen.has(entry.key) || !entry.table) continue;
      seen.add(entry.key);
      await run(`${dept} · ${entry.label}`, async () => {
        const id = await latestIdForDate(entry.table, date);
        if (!id) return 'skipped';
        return dispatch(entry, id, 'created', user);
      });
    }
  }

  // SMS motor-current sheets (Billet / Slab strands, Common Motor)
  for (const [key, sheet] of Object.entries(CASTER_SHEETS)) {
    await run(`SMS · ${sheet.label}`, async () => {
      const id = await latestIdForDate('sms_caster_motor_checklists', date, 'l.sheet = $2', [key]);
      if (!id) return 'skipped';
      const { rows } = await query(
        'SELECT report_date, recorded_by, readings, remark FROM sms_caster_motor_checklists WHERE id = $1',
        [id]
      );
      if (!rows[0]) return false;
      await notifyCasterMotorSheet({
        sheetKey: key, sheet, data: rows[0], action: 'created', actorName: user?.username,
      });
      return true;
    });
  }

  // PTM checksheets: latest log per template
  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (l.template_id) l.id, t.name
       FROM ptm_logs l JOIN ptm_templates t ON t.id = l.template_id
       WHERE l.log_date = $1
       ORDER BY l.template_id, l.created_at DESC`,
      [date]
    );
    if (!rows.length) results.skipped.push('PTM · Checksheet');
    for (const r of rows) {
      await run(`PTM · ${r.name}`, () => dispatch(PTM_NOTIFY_REGISTRY.logs, r.id, 'created', user));
    }
  } catch (e) {
    console.error('Date notification error [PTM checksheet]:', e.message);
    results.failed.push('PTM · Checksheet');
  }

  // Crane inspections done that day
  try {
    const { rows } = await query(
      `SELECT i.id, c.crane_number
       FROM inspections i JOIN cranes c ON c.id = i.crane_id
       WHERE i.inspection_date::date = $1::date
       ORDER BY c.crane_number`,
      [date]
    );
    if (!rows.length) results.skipped.push('Crane · Inspections');
    const InspectionController = require('../controllers/inspectionController');
    for (const r of rows) {
      await run(`Crane · ${r.crane_number}`, async () => {
        await InspectionController.sendInspectionTelegram(r.id);
        return true;
      });
    }
  } catch (e) {
    console.error('Date notification error [Crane]:', e.message);
    results.failed.push('Crane · Inspections');
  }

  return results;
}

module.exports = { sendDateNotifications };
