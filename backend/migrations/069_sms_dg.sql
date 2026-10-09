-- Migration 069: SMS Main PCC Room — DG check sheet

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'dg', 'DG', 13
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'dg'
);

CREATE TABLE IF NOT EXISTS sms_dg_checklists (
  id                     SERIAL PRIMARY KEY,
  report_date            DATE         NOT NULL,
  recorded_by            VARCHAR(150) NOT NULL,
  diesel_refill          VARCHAR(20),
  diesel_refill_remark   TEXT,
  air_cleaning           VARCHAR(30),
  running_hours          NUMERIC(12,2),
  running_hours_remark   TEXT,
  remark                 TEXT,
  filled_by              INTEGER      NOT NULL REFERENCES users(id),
  created_at             TIMESTAMPTZ  DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_dg_date ON sms_dg_checklists(report_date);
