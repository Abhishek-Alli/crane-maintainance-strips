// Daily status summaries for SMS, HSM and PTM — same layout as the HBM "Daily Sheet Status":
// one table per department, one line per sheet with its latest entry.
//
//   ✅ Filled   → an entry exists for the summary date
//   17 Nov      → no entry for that date; shows the date of the latest earlier entry
//   ❌ Never    → the sheet has no entries at all
//
// Sent to: the default TELEGRAM_CHAT_ID, admin recipients, and recipients subscribed to at least
// one sheet of that department (recipients on "alerts only" are skipped — a summary is not an alert).
// Scheduled daily from cron/cronJobs.js and also available from the Telegram settings screen.

const { query } = require('../config/database');
const { sendLongMessageToIds } = require('./telegram');
const {
  SMS_NOTIFY_REGISTRY,
  HSM_NOTIFY_REGISTRY,
  PTM_NOTIFY_REGISTRY,
} = require('./smsNotifyRegistry');
const { CASTER_SHEETS } = require('./smsCasterMotorConfig');

const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const DATE_COLS = ['report_date', 'log_date', 'delay_date', 'date', 'created_at'];

const rpad = (s, n) => String(s ?? '').substring(0, n).padEnd(n);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const columnCache = new Map();
/** { dateCol, dateExpr, hasCreated, hasFilledBy } for a table, or null when the table is missing */
async function tableInfo(table) {
  if (columnCache.has(table)) return columnCache.get(table);
  const { rows } = await query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
    [table]
  );
  let info = null;
  if (rows.length) {
    const cols = new Map(rows.map((r) => [r.column_name, r.data_type]));
    const dateCol = DATE_COLS.find((c) => cols.has(c));
    if (dateCol) {
      const isDate = cols.get(dateCol) === 'date';
      info = {
        dateCol,
        dateExpr: isDate
          ? `to_char(l.${dateCol}, 'YYYY-MM-DD')`
          : `to_char(l.${dateCol} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`,
        hasCreated: cols.has('created_at'),
        hasFilledBy: cols.has('filled_by'),
      };
    }
  }
  columnCache.set(table, info);
  return info;
}

/**
 * Latest entry on or before `date` -> { date: 'YYYY-MM-DD', by } | null.
 * `extraWhere` is a trusted SQL fragment from the registry (never user input).
 */
async function latestEntry(table, date, extraWhere = '', extraParams = []) {
  const info = await tableInfo(table);
  if (!info) return null;
  const params = [date, ...extraParams];
  const { rows } = await query(
    `SELECT ${info.dateExpr} AS d, ${info.hasFilledBy ? 'u.username' : 'NULL'} AS by
     FROM ${table} l
     ${info.hasFilledBy ? 'LEFT JOIN users u ON u.id = l.filled_by' : ''}
     WHERE ${info.dateExpr} <= $1 ${extraWhere ? `AND ${extraWhere}` : ''}
     ORDER BY ${info.dateExpr} DESC${info.hasCreated ? ', l.created_at DESC' : ''}
     LIMIT 1`,
    params
  );
  return rows[0] ? { date: rows[0].d, by: rows[0].by } : null;
}

const safe = async (fn) => {
  try { return await fn(); } catch (e) { console.error('Dept summary lookup error:', e.message); return null; }
};

/** The sheets of a department as [{ label, find(date) }] */
async function departmentSheets(dept) {
  const seen = new Set();
  const out = [];
  const add = (label, find) => out.push({ label, find });

  if (dept === 'sms') {
    Object.values(SMS_NOTIFY_REGISTRY).forEach(({ key, label, table }) => {
      if (seen.has(key) || !table) return;
      seen.add(key);
      add(label, (date) => latestEntry(table, date));
    });
    Object.entries(CASTER_SHEETS).forEach(([key, sheet]) => {
      add(sheet.label, (date) => latestEntry('sms_caster_motor_checklists', date, 'l.sheet = $2', [key]));
    });
  } else if (dept === 'hsm') {
    Object.values(HSM_NOTIFY_REGISTRY).forEach(({ key, label, table }) => {
      if (seen.has(key) || !table) return;
      seen.add(key);
      add(label, (date) => latestEntry(table, date));
    });
  } else if (dept === 'ptm') {
    // PTM checksheets: one line per template (mill / area)
    const { rows } = await query(`SELECT id, name FROM ptm_templates ORDER BY id`);
    rows.forEach((t) => {
      add(`PTM ${t.name}`, (date) => latestEntry('ptm_logs', date, 'l.template_id = $2', [t.id]));
    });
    const bd = PTM_NOTIFY_REGISTRY.breakdown;
    add(bd.label, (date) => latestEntry(bd.table, date));
  }
  return out;
}

const DEPT_META = {
  sms: { title: 'SMS Daily Sheet Status', icon: '🏭', keys: () => [
    ...new Set(Object.values(SMS_NOTIFY_REGISTRY).map((e) => e.key)),
    ...Object.keys(CASTER_SHEETS),
  ] },
  hsm: { title: 'HSM Daily Sheet Status', icon: '🔩', keys: () => Object.values(HSM_NOTIFY_REGISTRY).map((e) => e.key) },
  ptm: { title: 'PTM Daily Sheet Status', icon: '⚙️', keys: () => Object.values(PTM_NOTIFY_REGISTRY).map((e) => e.key) },
};

async function recipientsFor(dept) {
  const ids = new Set();
  if (DEFAULT_CHAT_ID) ids.add(String(DEFAULT_CHAT_ID));
  try {
    const { rows } = await query(
      `SELECT chat_id FROM telegram_recipients
       WHERE is_active = true
         AND (is_admin = true OR (alerts_only = false AND sms_sheets && $1::text[]))`,
      [DEPT_META[dept].keys()]
    );
    rows.forEach((r) => ids.add(String(r.chat_id)));
  } catch (e) {
    console.error('Dept summary recipients error:', e.message);
  }
  return [...ids];
}

function buildSummaryMessage(dept, date, rows) {
  const C1 = 2; const C2 = 27; const C3 = 9; const C4 = 10;
  const sep = '─'.repeat(C1 + C2 + C3 + C4 + 3);
  const filled = rows.filter((r) => r.status === 'today').length;
  const never = rows.filter((r) => r.status === 'none').length;
  const earlier = rows.length - filled - never;
  const genTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

  let table = `${rpad('#', C1)} ${rpad('Sheet', C2)} ${rpad('Status', C3)} ${rpad('Filled By', C4)}\n${sep}\n`;
  rows.forEach((r, i) => {
    const status = r.status === 'today' ? '✅ Filled' : r.status === 'earlier' ? shortDate(r.date) : '❌ Never';
    table += `${String(i + 1).padStart(C1)} ${rpad(r.label, C2)} ${rpad(status, C3)} ${rpad(r.by || '—', C4)}\n`;
  });
  table += `${sep}\nTotal: ${rows.length}  ✅${filled}  ·${earlier}  ❌${never}`;

  const { title, icon } = DEPT_META[dept];
  return `<b>${icon} ${esc(title)}</b>\n📅 <b>${shortDate(date)}</b>  ⏰ ${genTime}\n<pre>${esc(table)}</pre>`;
}

/** Sends one department's summary. Returns { dept, sheets, recipients } */
async function sendDeptStatusSummary(dept, date = istToday()) {
  if (!DEPT_META[dept]) throw new Error(`Unknown department: ${dept}`);
  const sheets = await departmentSheets(dept);
  const rows = [];
  for (const sheet of sheets) {
    const latest = await safe(() => sheet.find(date));
    rows.push({
      label: sheet.label,
      status: !latest ? 'none' : latest.date === date ? 'today' : 'earlier',
      date: latest?.date,
      by: latest?.by,
    });
  }
  const chatIds = await recipientsFor(dept);
  if (chatIds.length && rows.length) {
    await sendLongMessageToIds(chatIds, buildSummaryMessage(dept, date, rows));
  }
  return { dept, sheets: rows.length, recipients: chatIds.length };
}

/** SMS + HSM + PTM, one message each */
async function sendAllDeptStatusSummaries(date = istToday()) {
  const results = [];
  for (const dept of Object.keys(DEPT_META)) {
    try {
      results.push(await sendDeptStatusSummary(dept, date));
    } catch (e) {
      console.error(`Dept summary error [${dept}]:`, e.message);
      results.push({ dept, error: e.message });
    }
  }
  return results;
}

module.exports = { sendDeptStatusSummary, sendAllDeptStatusSummaries, buildSummaryMessage };
