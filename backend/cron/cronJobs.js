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
 * JOB 3 – HBM CHECKSHEET DAILY SUMMARY (8 PM IST)
 * Lists all checksheets, which are filled today, which are remaining,
 * and how many consecutive days each unfilled checksheet has been missing.
 */
async function hbmChecksheetDailySummary() {
  try {
    const dayjs = require('dayjs');
    const today = dayjs().format('YYYY-MM-DD');
    const todayFormatted = dayjs().format('DD-MM-YYYY');

    // All checksheets with their log table and display name
    const CHECKSHEETS = [
      { key: 'rolling_stand',    label: 'Rolling Stand',         table: 'hbm_rolling_stand_logs' },
      { key: 'pumphouse',        label: 'Pumphouse',             table: 'hbm_pumphouse_logs' },
      { key: 'bar_bundle',       label: 'Bar Bundle',            table: 'hbm_bar_bundle_logs' },
      { key: 'before_rolling',   label: 'Before Rolling',        table: 'hbm_before_rolling_logs' },
      { key: 'pump_param',       label: 'Pump Parameter',        table: 'hbm_pump_param_logs' },
      { key: 'water_param',      label: 'Water Parameter',       table: 'hbm_water_param_logs' },
      { key: 'ph_maint',         label: 'Pumphouse Maintenance', table: 'hbm_ph_maint_logs' },
      { key: 'transformer',      label: 'Transformer',           table: 'hbm_transformer_logs' },
      { key: 'oil_level',        label: 'Oil Level',             table: 'hbm_oil_level_logs' },
      { key: 'dc_motor_airflow', label: 'DC Motor Airflow',      table: 'hbm_dc_motor_airflow_logs' },
      { key: 'roughing_gb_temp', label: 'Roughing GB Temp',      table: 'hbm_roughing_gb_temp_logs' },
    ];

    const filled = [];
    const missing = [];

    for (const cs of CHECKSHEETS) {
      // Check if filled today
      const todayRes = await query(
        `SELECT COUNT(*) AS cnt FROM ${cs.table} WHERE log_date = $1`,
        [today]
      );
      const filledToday = parseInt(todayRes.rows[0].cnt, 10) > 0;

      if (filledToday) {
        filled.push(cs.label);
      } else {
        // Find last filled date to compute missing streak
        const lastRes = await query(
          `SELECT log_date FROM ${cs.table} ORDER BY log_date DESC LIMIT 1`
        );
        let missingDays = null;
        if (lastRes.rows.length > 0) {
          const lastDate = dayjs(lastRes.rows[0].log_date);
          missingDays = dayjs(today).diff(lastDate, 'day');
        }
        missing.push({ label: cs.label, missingDays });
      }
    }

    const total = CHECKSHEETS.length;
    let msg = `📊 <b>HBM Checksheet Daily Report</b>\n`;
    msg += `📅 Date: ${todayFormatted}\n\n`;
    msg += `📋 Total Checksheets: <b>${total}</b>\n`;
    msg += `✅ Filled Today: <b>${filled.length}</b>\n`;
    msg += `❌ Remaining: <b>${missing.length}</b>\n`;

    if (filled.length > 0) {
      msg += `\n✅ <b>Filled Today:</b>\n`;
      filled.forEach(label => { msg += `  • ${label}\n`; });
    }

    if (missing.length > 0) {
      msg += `\n❌ <b>Not Filled Today:</b>\n`;
      missing.forEach(({ label, missingDays }) => {
        if (missingDays === null) {
          msg += `  ⚠️ ${label} — <b>Never filled</b>\n`;
        } else if (missingDays === 1) {
          msg += `  🔴 ${label} — Not filled today\n`;
        } else {
          msg += `  🚨 ${label} — <b>Not filled for ${missingDays} day${missingDays > 1 ? 's' : ''}</b>\n`;
        }
      });
    }

    if (missing.length === 0) {
      msg += `\n🎉 All checksheets filled for today!`;
    }

    // ── Crane Inspections section ──────────────────────────────────────────
    const { rows: inspections } = await query(`
      SELECT
        c.crane_number,
        s.name        AS shed,
        d.name        AS department,
        u.name        AS recorded_by
      FROM inspections i
      JOIN cranes      c ON c.id = i.crane_id
      JOIN sheds       s ON s.id = i.shed_id
      JOIN departments d ON d.id = s.department_id
      JOIN users       u ON u.id = i.recorded_by
      WHERE DATE(i.inspection_date) = $1
      ORDER BY d.name, s.name, c.crane_number
    `, [today]);

    msg += `\n\n━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🏗️ <b>Crane Inspections Today</b>\n`;

    if (inspections.length === 0) {
      msg += `No crane inspections recorded today.\n`;
    } else {
      // Group by department
      const byDept = {};
      inspections.forEach(row => {
        if (!byDept[row.department]) byDept[row.department] = [];
        byDept[row.department].push(row);
      });

      msg += `Total: <b>${inspections.length}</b> inspection(s)\n`;

      Object.entries(byDept).forEach(([dept, rows]) => {
        msg += `\n🏭 <b>${dept}</b>\n`;
        rows.forEach(r => {
          msg += `  • Crane ${r.crane_number} — ${r.shed} (by ${r.recorded_by})\n`;
        });
      });
    }

    await sendTelegramMessage(msg);
    console.log(`[CRON 8PM] HBM daily summary sent – ${filled.length}/${total} filled, ${inspections.length} crane inspection(s)`);
  } catch (error) {
    console.error('[CRON 8PM] HBM checksheet summary error:', error);
  }
}

/**
 * JOB 4 – HBM DATA RETENTION CLEANUP
 * Deletes HBM checksheets older than 1 year
 * hbm_checksheet_values auto-deletes via CASCADE
 * Runs daily at 2:30 AM IST as backend fallback
 * (pg_cron in Supabase is the primary cleanup — see migration 011)
 */
async function hbmDataCleanup() {
  try {
    const result = await query(`
      DELETE FROM hbm_checksheets
      WHERE created_at < NOW() - INTERVAL '1 year'
      RETURNING id
    `);

    const count = result.rows.length;
    if (count > 0) {
      console.log(`[CRON 2:30AM] HBM Cleanup: Deleted ${count} checksheet(s) older than 1 year`);
    } else {
      console.log('[CRON 2:30AM] HBM Cleanup: No old records to delete');
    }
  } catch (error) {
    console.error('[CRON 2:30AM] HBM Cleanup error:', error);
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

  cron.schedule('0 20 * * *', () => {
    console.log('[CRON] Running 8 PM HBM checksheet daily summary...');
    hbmChecksheetDailySummary();
  }, { timezone: 'Asia/Kolkata' });

  // HBM 1-year data retention — runs daily at 2:30 AM IST
  // This is a backend fallback; pg_cron in Supabase is the primary (see migration 011)
  cron.schedule('30 2 * * *', () => {
    console.log('[CRON] Running 2:30 AM HBM data cleanup...');
    hbmDataCleanup();
  }, { timezone: 'Asia/Kolkata' });

  console.log('  Cron Jobs:');
  console.log('    - Maintenance Due Alert      → 09:00 AM IST');
  console.log('    - Daily Inspection Summary   → 06:00 PM IST');
  console.log('    - HBM Checksheet Summary     → 08:00 PM IST');
  console.log('    - HBM Data Cleanup (1yr)     → 02:30 AM IST');
}

module.exports = { startCronJobs, maintenanceDueAlert, dailyInspectionSummary, hbmChecksheetDailySummary, hbmDataCleanup };
