-- Migration 038: HSM Mechanical Activities During Roll Change

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'HSM_CHECKSHEETS', 'roll-change-activity', 'Mechanical Activities During Roll Change', 2
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'HSM_CHECKSHEETS' AND item_key = 'roll-change-activity'
);

CREATE TABLE IF NOT EXISTS hsm_roll_change_activity_logs (
  id               SERIAL PRIMARY KEY,
  report_date      DATE         NOT NULL,
  shift            VARCHAR(10)  NOT NULL,
  area             VARCHAR(100) NOT NULL,
  remark           TEXT,
  shift_incharge   VARCHAR(150),
  shift_engineer   VARCHAR(150),
  filled_by        INTEGER      NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hsm_roll_change_equipment_entries (
  id               SERIAL PRIMARY KEY,
  log_id           INTEGER      NOT NULL REFERENCES hsm_roll_change_activity_logs(id) ON DELETE CASCADE,
  equipment_key    VARCHAR(100) NOT NULL,
  equipment_label  VARCHAR(150) NOT NULL,
  custom_name      VARCHAR(200),
  job_details      TEXT,
  sort_order       INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hsm_roll_change_manpower_entries (
  id               SERIAL PRIMARY KEY,
  log_id           INTEGER      NOT NULL REFERENCES hsm_roll_change_activity_logs(id) ON DELETE CASCADE,
  person_name      VARCHAR(150) NOT NULL,
  sort_order       INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_hsm_rca_report_date ON hsm_roll_change_activity_logs(report_date);
CREATE INDEX IF NOT EXISTS idx_hsm_rca_area ON hsm_roll_change_activity_logs(area);
CREATE INDEX IF NOT EXISTS idx_hsm_rca_eq_log ON hsm_roll_change_equipment_entries(log_id);
CREATE INDEX IF NOT EXISTS idx_hsm_rca_mp_log ON hsm_roll_change_manpower_entries(log_id);
