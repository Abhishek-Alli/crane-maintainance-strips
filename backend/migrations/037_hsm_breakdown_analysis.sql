-- Migration 037: HSM Breakdown Analysis Report (same schema as SMS)

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'HSM_CHECKSHEETS', 'breakdown-analysis', 'Breakdown Analysis Report', 1
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'HSM_CHECKSHEETS' AND item_key = 'breakdown-analysis'
);

CREATE TABLE IF NOT EXISTS hsm_breakdown_analysis_logs (
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

CREATE INDEX IF NOT EXISTS idx_hsm_ba_report_date ON hsm_breakdown_analysis_logs(report_date);
CREATE INDEX IF NOT EXISTS idx_hsm_ba_machine ON hsm_breakdown_analysis_logs(machine_name);
