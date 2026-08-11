// Run once: node run-migration-036.js
const { pool } = require('./config/database');
require('dotenv').config();

async function runStep(label, sql) {
  try {
    await pool.query(sql);
    console.log(`✓ ${label}`);
    return true;
  } catch (err) {
    console.warn(`⚠ ${label}: ${err.message}`);
    return false;
  }
}

async function run() {
  console.log('Running migration 036 — SMS Breakdown Analysis Report...');

  // 1) user_type constraint (needs table owner — may fail on hosted DB)
  await runStep(
    'users.user_type_check (SMS + PTM)',
    `
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
    ALTER TABLE users ADD CONSTRAINT users_user_type_check
      CHECK (user_type IN (
        'ADMIN',
        'CRANE_MAINTENANCE',
        'HBM_CHECKSHEETS',
        'HSM_CHECKSHEETS',
        'PTM_CHECKSHEETS',
        'SMS_CHECKSHEETS'
      ));
    `
  );

  // 2) Register SMS module
  await runStep(
    'app_modules SMS row',
    `
    INSERT INTO app_modules (name, code, color, route_prefix, display_order)
    SELECT 'SMS Checksheets', 'SMS_CHECKSHEETS', 'amber', '/sms', 5
    WHERE NOT EXISTS (SELECT 1 FROM app_modules WHERE code = 'SMS_CHECKSHEETS');
    `
  );

  // 3) Permission list item
  await runStep(
    'app_permission_lists breakdown-analysis',
    `
    INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
    SELECT 'SMS_CHECKSHEETS', 'breakdown-analysis', 'Breakdown Analysis Report', 1
    WHERE NOT EXISTS (
      SELECT 1 FROM app_permission_lists
      WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'breakdown-analysis'
    );
    `
  );

  // 4) Main table
  const tableOk = await runStep(
    'sms_breakdown_analysis_logs table',
    `
    CREATE TABLE IF NOT EXISTS sms_breakdown_analysis_logs (
      id                      SERIAL PRIMARY KEY,
      report_date             DATE         NOT NULL,
      department              VARCHAR(150),
      machine_name            VARCHAR(200) NOT NULL,
      breakdown_at            TIMESTAMPTZ,
      restoration_at          TIMESTAMPTZ,
      total_downtime_minutes  INTEGER,
      breakdown_type          VARCHAR(150),
      observed_problem        TEXT,
      immediate_cause         TEXT,
      root_cause              TEXT,
      why1_problem            TEXT,
      why1_due_to             TEXT,
      why2_problem            TEXT,
      why2_due_to             TEXT,
      why3_problem            TEXT,
      why3_due_to             TEXT,
      why4_problem            TEXT,
      why4_due_to             TEXT,
      why5_problem            TEXT,
      why5_due_to             TEXT,
      action_taken_to_restore TEXT,
      time_taken_for_repair   VARCHAR(100),
      preventive_steps        TEXT,
      spare_parts_used        TEXT,
      prepared_by             VARCHAR(150),
      verified_by             VARCHAR(150),
      filled_by               INTEGER      NOT NULL REFERENCES users(id),
      created_at              TIMESTAMPTZ  DEFAULT NOW(),
      updated_at              TIMESTAMPTZ  DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sms_ba_report_date ON sms_breakdown_analysis_logs(report_date);
    CREATE INDEX IF NOT EXISTS idx_sms_ba_machine ON sms_breakdown_analysis_logs(machine_name);
    `
  );

  if (!tableOk) {
    console.error('Migration failed: could not create sms_breakdown_analysis_logs');
    process.exitCode = 1;
  } else {
    console.log('Migration 036 completed (see warnings above if any).');
  }

  await pool.end();
}

run().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch (_) { /* ignore */ }
  process.exit(1);
});
