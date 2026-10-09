-- Migration 072: SMS Main PCC Room — Compressor Scheduled PM check sheet
-- Status checks are stored as JSONB ({ key: { value, remark } }); keys live in utils/smsCompressorPmConfig.js.

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'compressor-pm', 'Compressor - Scheduled', 16
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'compressor-pm'
);

CREATE TABLE IF NOT EXISTS sms_compressor_pm_checklists (
  id               SERIAL PRIMARY KEY,
  schedule_id      INTEGER,
  schedule_detail  TEXT,
  recorded_by      VARCHAR(150) NOT NULL,
  checks           JSONB        NOT NULL DEFAULT '{}'::jsonb,
  current_r        NUMERIC(10,2),
  current_y        NUMERIC(10,2),
  current_b        NUMERIC(10,2),
  remark           TEXT,
  filled_by        INTEGER      NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_compressor_pm_created ON sms_compressor_pm_checklists(created_at);
