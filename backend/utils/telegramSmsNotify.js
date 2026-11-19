// Telegram notifications for SMS checksheets.
//
// Who receives a message:
//   - the default TELEGRAM_CHAT_ID from .env  -> always (treated as admin)
//   - recipients flagged is_admin             -> always (every sheet, normal or abnormal, new or edited)
//   - everyone else                           -> only if subscribed to the sheet (sms_sheets),
//                                                and, when alerts_only is on, only for abnormal entries
// An edited entry sends a fresh message marked "UPDATED".

const { query } = require('../config/database');
const { sendLongMessageToIds } = require('./telegram');

const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmtDate = (d) => {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? String(d ?? '—')
    : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};
const fmtNow = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });

/** Chat IDs that should get a message for this SMS sheet */
async function getSmsRecipientIds(sheetKey, hasAlert) {
  const ids = new Set();
  if (DEFAULT_CHAT_ID) ids.add(String(DEFAULT_CHAT_ID));
  try {
    const { rows } = await query(
      `SELECT chat_id, is_admin, alerts_only, sms_sheets
       FROM telegram_recipients WHERE is_active = true`
    );
    rows.forEach((r) => {
      if (r.is_admin) return ids.add(String(r.chat_id));
      const subscribed = Array.isArray(r.sms_sheets) && r.sms_sheets.includes(sheetKey);
      if (!subscribed) return;
      if (r.alerts_only && !hasAlert) return;
      ids.add(String(r.chat_id));
    });
  } catch (e) {
    console.error('getSmsRecipientIds error:', e.message);
  }
  return [...ids];
}

/**
 * Motor-current sheets (Billet / Slab strands, Common Motor).
 * data = { report_date, recorded_by, readings: { key: { value, remark } }, remark }
 */
async function notifyCasterMotorSheet({ sheetKey, sheet, data, action, actorName }) {
  try {
    const readings = data.readings || {};
    const over = sheet.motors.filter((m) => {
      const v = readings[m.key]?.value;
      return v !== null && v !== undefined && v !== '' && Number(v) > m.max;
    });
    const hasAlert = over.length > 0;

    const chatIds = await getSmsRecipientIds(sheetKey, hasAlert);
    if (!chatIds.length) return;

    const updated = action === 'updated';
    const nameW = Math.max(...sheet.motors.map((m) => m.label.length));
    const lines = sheet.motors.map((m) => {
      const v = readings[m.key]?.value;
      const has = v !== null && v !== undefined && v !== '';
      const isOver = has && Number(v) > m.max;
      const actual = has ? String(Number(v)) : '—';
      return `${isOver ? '▲' : ' '} ${esc(m.label.padEnd(nameW))}  ${actual.padStart(6)} / ${String(m.max).padEnd(5)}`;
    });

    let msg =
      `🏭 <b>${esc(sheet.label)}</b>${updated ? '  ✏️ <b>UPDATED</b>' : ''}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 <b>${fmtDate(data.report_date)}</b>\n` +
      `👤 Recorded By: <b>${esc(data.recorded_by)}</b>\n` +
      `${updated ? '✏️ Edited By' : '📝 Filled By'}: <b>${esc(actorName || '—')}</b>\n` +
      `🕐 ${updated ? 'Edited' : 'Submitted'}: <b>${fmtNow()}</b>\n` +
      (hasAlert
        ? `⚠️ <b>${over.length} motor${over.length > 1 ? 's' : ''} above max current</b>\n`
        : `✅ All motors within max current\n`) +
      `\n<pre>${'  '}${esc('Motor'.padEnd(nameW))}  ${'Actual'.padStart(6)} / Max (A)\n${lines.join('\n')}</pre>`;

    const remarks = over
      .map((m) => (readings[m.key]?.remark ? `• ${esc(m.label)}: ${esc(readings[m.key].remark)}` : null))
      .filter(Boolean);
    if (remarks.length) msg += `\n\n<b>Remarks</b>\n${remarks.join('\n')}`;
    if (data.remark) msg += `\n\n<b>Note:</b> ${esc(data.remark)}`;

    await sendLongMessageToIds(chatIds, msg);
  } catch (e) {
    console.error('notifyCasterMotorSheet error:', e.message);
  }
}

module.exports = { getSmsRecipientIds, notifyCasterMotorSheet };
