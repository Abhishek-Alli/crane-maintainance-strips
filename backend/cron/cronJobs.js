// Cron Jobs – Crane Maintenance Telegram Alerts
// Job functions are standalone – can be called by node-cron (local) or HTTP (Vercel)

const dayjs = require('dayjs');
const { query } = require('../config/database');
const { sendTelegramMessage } = require('../utils/telegram');

/**
 * JOB 1 – NEXT MAINTENANCE ALERT
 * Finds cranes whose next maintenance date is today or within 2 days
 */
async function maintenanceDueAlert() {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const twoDaysLater = dayjs().add(2, 'day').format('YYYY-MM-DD');

    const { rows } = await query(`
      SELECT
        c.crane_number,
        s.name AS shed,
        c.maintenance_frequency,
        sub.last_date,
        CASE
          WHEN c.maintenance_frequency = 'DAILY'   THEN sub.last_date + INTERVAL '1 day'
          WHEN c.maintenance_frequency = 'WEEKLY'  THEN sub.last_date + INTERVAL '7 days'
          WHEN c.maintenance_frequency = 'MONTHLY' THEN sub.last_date + INTERVAL '1 month'
        END AS next_maintenance_date
      FROM cranes c
      JOIN sheds s ON s.id = c.shed_id
      LEFT JOIN LATERAL (
        SELECT i.inspection_date AS last_date
        FROM inspections i
        WHERE i.crane_id = c.id
        ORDER BY i.inspection_date DESC
        LIMIT 1
      ) sub ON true
      WHERE c.is_active = true
        AND sub.last_date IS NOT NULL
      ORDER BY c.crane_number
    `);

    const dueCranes = rows.filter((r) => {
      const nmd = dayjs(r.next_maintenance_date).format('YYYY-MM-DD');
      return nmd >= today && nmd <= twoDaysLater;
    });

    if (dueCranes.length === 0) {
      console.log('[CRON 9AM] No cranes due for maintenance');
      return;
    }

    for (const crane of dueCranes) {
      const nmd = dayjs(crane.next_maintenance_date).format('DD-MM-YYYY');
      const isDueToday = dayjs(crane.next_maintenance_date).format('YYYY-MM-DD') === today;

      const msg =
        `🔧 <b>Crane Maintenance Alert</b>\n\n` +
        `Crane No: ${crane.crane_number}\n` +
        `Shed: ${crane.shed}\n` +
        `Frequency: ${crane.maintenance_frequency}\n` +
        `Next Maintenance: ${nmd}\n` +
        `Status: ${isDueToday ? '⚠️ DUE TODAY' : '🔜 DUE SOON'}`;

      await sendTelegramMessage(msg);
    }

    console.log(`[CRON 9AM] Sent maintenance alerts for ${dueCranes.length} crane(s)`);
  } catch (error) {
    console.error('[CRON 9AM] Maintenance alert error:', error);
  }
}

/**
 * JOB 2 – DAILY INSPECTION SUMMARY
 * Summarises all inspections done today + issues found
 */
async function dailyInspectionSummary() {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const todayFormatted = dayjs().format('DD-MM-YYYY');

    const { rows: inspections } = await query(`
      SELECT
        i.id,
        c.crane_number,
        s.name AS shed,
        i.has_alerts
      FROM inspections i
      JOIN cranes c ON c.id = i.crane_id
      JOIN sheds s  ON s.id = i.shed_id
      WHERE DATE(i.inspection_date) = $1
      ORDER BY c.crane_number
    `, [today]);

    if (inspections.length === 0) {
      const msg =
        `📋 <b>Today's Crane Maintenance Report</b>\n` +
        `Date: ${todayFormatted}\n\n` +
        `No inspections were recorded today.`;
      await sendTelegramMessage(msg);
      console.log('[CRON 6PM] No inspections today – summary sent');
      return;
    }

    const totalInspections = inspections.length;
    const inspectionIds = inspections.map((i) => i.id);

    const { rows: issues } = await query(`
      SELECT
        c.crane_number,
        fi.field_name AS item_name
      FROM inspection_values iv
      JOIN inspections i   ON i.id  = iv.inspection_id
      JOIN cranes c        ON c.id  = i.crane_id
      JOIN form_items fi   ON fi.id = iv.item_id
      WHERE iv.inspection_id = ANY($1)
        AND UPPER(iv.selected_value) = 'NOT_OK'
      ORDER BY c.crane_number, fi.field_name
    `, [inspectionIds]);

    const issuesByCrane = {};
    issues.forEach((issue) => {
      if (!issuesByCrane[issue.crane_number]) {
        issuesByCrane[issue.crane_number] = [];
      }
      issuesByCrane[issue.crane_number].push(issue.item_name);
    });

    let msg =
      `📋 <b>Today's Crane Maintenance Report</b>\n` +
      `Date: ${todayFormatted}\n\n` +
      `✅ Total Inspections: ${totalInspections}\n`;

    const craneKeys = Object.keys(issuesByCrane);
    if (craneKeys.length > 0) {
      msg += `\n❌ <b>Issues Found:</b>\n`;
      craneKeys.forEach((crane) => {
        msg += `- Crane: ${crane} → ${issuesByCrane[crane].join(', ')}\n`;
      });
    } else {
      msg += `\n✅ No issues found – all inspections OK`;
    }

    await sendTelegramMessage(msg);
    console.log(`[CRON 6PM] Daily summary sent – ${totalInspections} inspections, ${craneKeys.length} with issues`);
  } catch (error) {
    console.error('[CRON 6PM] Daily summary error:', error);
  }
}

/**
 * Schedule cron jobs using node-cron (local dev only)
 */
function startCronJobs() {
  const cron = require('node-cron');

  cron.schedule('0 9 * * *', () => {
    console.log('[CRON] Running 9 AM maintenance due alert...');
    maintenanceDueAlert();
  }, { timezone: 'Asia/Kolkata' });

  cron.schedule('0 18 * * *', () => {
    console.log('[CRON] Running 6 PM daily inspection summary...');
    dailyInspectionSummary();
  }, { timezone: 'Asia/Kolkata' });

  console.log('  Cron Jobs:');
  console.log('    - Maintenance Due Alert  → 09:00 AM IST');
  console.log('    - Daily Inspection Summary → 06:00 PM IST');
}

module.exports = { startCronJobs, maintenanceDueAlert, dailyInspectionSummary };
