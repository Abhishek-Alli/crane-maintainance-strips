const { query } = require('../config/database');
const { sendPush } = require('./firebase');

const HOD_SHEETS = require('../controllers/hodController').HOD_SHEETS;

const SHEET_MODULE_MAP = {};
Object.entries(HOD_SHEETS).forEach(([moduleCode, sheets]) => {
  sheets.forEach(s => { SHEET_MODULE_MAP[s.key] = moduleCode; });
});

async function getTokensForUser(userId) {
  const r = await query('SELECT token FROM fcm_tokens WHERE user_id = $1', [userId]);
  return r.rows.map(r => r.token);
}

async function removeTokens(tokens) {
  if (!tokens.length) return;
  await query('DELETE FROM fcm_tokens WHERE token = ANY($1)', [tokens]);
}

/** Save notification records to DB for in-app history */
async function saveNotifications(userIds, { title, body, url }) {
  if (!userIds.length) return;
  const values = userIds.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');
  const params = userIds.flatMap(uid => [uid, title, body || '', url || '/']);
  await query(`INSERT INTO notifications (user_id, title, body, url) VALUES ${values}`, params);
}

/** Notify HOD users when a new checksheet is submitted */
async function notifyHodNewSheet({ moduleCode, sheetKey, sheetLabel, filledBy, recordId }) {
  try {
    const hodUsers = await query(
      `SELECT u.id, hp.allowed_scope
       FROM users u
       LEFT JOIN hod_user_permissions hp ON hp.user_id = u.id
       WHERE u.user_type = 'HOD' AND u.is_active = true`
    );

    const eligibleIds = [];
    for (const u of hodUsers.rows) {
      const scope = u.allowed_scope;
      if (scope === null) { eligibleIds.push(u.id); continue; }
      if (!(moduleCode in scope)) continue;
      const modVal = scope[moduleCode];
      if (modVal === null || (Array.isArray(modVal) && modVal.includes(sheetKey))) {
        eligibleIds.push(u.id);
      }
    }
    if (!eligibleIds.length) return;

    const title = `New Checksheet: ${sheetLabel}`;
    const body  = `Filled by ${filledBy} — tap to review`;
    const url   = `/hod/sheets/${sheetKey}/${recordId}`;

    // Save to DB for in-app history
    await saveNotifications(eligibleIds, { title, body, url });

    // Send push to FCM tokens
    const rows = await query('SELECT token FROM fcm_tokens WHERE user_id = ANY($1)', [eligibleIds]);
    const tokens = rows.rows.map(r => r.token);
    if (tokens.length) {
      const result = await sendPush(tokens, { title, body, data: { tag: `sheet-${sheetKey}-${recordId}` }, url });
      if (result?.invalid?.length) await removeTokens(result.invalid);
    }
  } catch (err) {
    console.error('notifyHodNewSheet error:', err.message);
  }
}

/** 6 PM reminder to HOD — pending unseen records */
async function notifyHodPendingReview() {
  try {
    const hodUsers = await query(
      `SELECT u.id
       FROM users u
       WHERE u.user_type = 'HOD' AND u.is_active = true`
    );

    for (const u of hodUsers.rows) {
      const pending = await query(
        `SELECT COUNT(*) as cnt FROM hsm_hod_signoffs WHERE seen_by IS NULL`
      );
      const cnt = parseInt(pending.rows[0]?.cnt || 0);
      if (cnt === 0) continue;

      const title = 'HOD Review Pending';
      const body  = `${cnt} checksheet${cnt !== 1 ? 's' : ''} pending review. Please check before end of day.`;
      const url   = '/hod/dashboard';

      await saveNotifications([u.id], { title, body, url });

      const tokens = await getTokensForUser(u.id);
      if (tokens.length) {
        const result = await sendPush(tokens, { title, body, data: { tag: 'hod-pending-reminder' }, url });
        if (result?.invalid?.length) await removeTokens(result.invalid);
      }
    }
  } catch (err) {
    console.error('notifyHodPendingReview error:', err.message);
  }
}

/** 6 PM reminder to operators — sheets not filled today */
async function notifyOperatorsSheetsNotFilled() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const moduleChecks = [
      {
        module: 'HBM', userType: 'HBM_CHECKSHEETS', dashUrl: '/hbm/dashboard',
        tables: [
          { table: 'hbm_dc_motor_logs',        dateCol: 'log_date',       label: 'DC Motor' },
          { table: 'hbm_cooling_bed_logs',      dateCol: 'log_date',       label: 'Cooling Bed' },
          { table: 'hbm_rolling_stand_logs',    dateCol: 'log_date',       label: 'Rolling Stand' },
          { table: 'hbm_mill_mech_logs',        dateCol: 'log_date',       label: 'Mill Mechanical' },
          { table: 'hbm_pumphouse_logs',        dateCol: 'log_date',       label: 'Pumphouse' },
          { table: 'hbm_bar_bundle_logs',       dateCol: 'log_date',       label: 'Bar Bundle' },
          { table: 'hbm_before_rolling_logs',   dateCol: 'log_date',       label: 'Before Rolling' },
        ],
      },
      {
        module: 'HSM', userType: 'HSM_CHECKSHEETS', dashUrl: '/hsm/dashboard',
        tables: [
          { table: 'hsm_fm_daily_logs',         dateCol: 'report_date',    label: 'FM Daily' },
          { table: 'hsm_delay_reports',         dateCol: 'report_date',    label: 'Delay Report' },
        ],
      },
    ];

    for (const { module, userType, dashUrl, tables } of moduleChecks) {
      const opsRes = await query(
        `SELECT u.id FROM users u WHERE u.user_type = $1 AND u.is_active = true`,
        [userType]
      );
      const userIds = opsRes.rows.map(r => r.id);
      if (!userIds.length) continue;

      const unfilled = [];
      for (const { table, dateCol, label } of tables) {
        try {
          const r = await query(
            `SELECT COUNT(*) as cnt FROM ${table} WHERE ${dateCol}::date = $1`,
            [today]
          );
          if (parseInt(r.rows[0].cnt) === 0) unfilled.push(label);
        } catch (_) {}
      }
      if (!unfilled.length) continue;

      const title = `${module} Sheets Not Filled Today`;
      const body  = `Not filled: ${unfilled.join(', ')}`;

      await saveNotifications(userIds, { title, body, url: dashUrl });

      const tokRows = await query('SELECT token FROM fcm_tokens WHERE user_id = ANY($1)', [userIds]);
      const tokens = tokRows.rows.map(r => r.token);
      if (tokens.length) {
        const result = await sendPush(tokens, { title, body, data: { tag: `${module.toLowerCase()}-unfilled` }, url: dashUrl });
        if (result?.invalid?.length) await removeTokens(result.invalid);
      }
    }
  } catch (err) {
    console.error('notifyOperatorsSheetsNotFilled error:', err.message);
  }
}

module.exports = {
  notifyHodNewSheet,
  notifyHodPendingReview,
  notifyOperatorsSheetsNotFilled,
  saveNotifications,
  SHEET_MODULE_MAP,
};
