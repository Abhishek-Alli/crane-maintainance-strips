-- Migration 070: SMS Main PCC Room — Furnace Pollution Scheduled PM check sheet
-- The 26 check points are stored as JSONB ({ key: { value, remark } }); keys live in utils/smsFurnacePollutionPmConfig.js.

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'furnace-pollution-pm', 'Furnace Pollution - Scheduled', 14
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'furnace-pollution-pm'
);

CREATE TABLE IF NOT EXISTS sms_furnace_pollution_pm_checklists (
  id               SERIAL PRIMARY KEY,
  schedule_id      INTEGER,
  schedule_detail  TEXT,
  recorded_by      VARCHAR(150) NOT NULL,
  checks           JSONB        NOT NULL DEFAULT '{}'::jsonb,
  remark           TEXT,
  filled_by        INTEGER      NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_fp_pm_created ON sms_furnace_pollution_pm_checklists(created_at);
