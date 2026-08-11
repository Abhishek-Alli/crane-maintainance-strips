-- Migration 036: SMS module + Breakdown Analysis Report
-- Adds SMS_CHECKSHEETS login type, app_modules row, permission list entry,
-- and sms_breakdown_analysis_logs table (RCA / 5-Why / CA / PA).

-- 1) Allow SMS (and PTM if missing) on users.user_type
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

-- 2) Register SMS in app_modules (idempotent)
INSERT INTO app_modules (name, code, color, route_prefix, display_order)
SELECT 'SMS Checksheets', 'SMS_CHECKSHEETS', 'amber', '/sms', 5
WHERE NOT EXISTS (SELECT 1 FROM app_modules WHERE code = 'SMS_CHECKSHEETS');

-- 3) Permission list item for Create User sheet toggles
INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'breakdown-analysis', 'Breakdown Analysis Report', 1
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'breakdown-analysis'
);

-- 4) Breakdown Analysis Report table
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
