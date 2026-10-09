-- Migration 073: SMS Main PCC Room — Furnace Pollution daily check sheet
-- Status checks and motor currents are stored as JSONB; keys live in utils/smsFurnacePollutionConfig.js.

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'furnace-pollution', 'Furnace Pollution', 17
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'furnace-pollution'
);

CREATE TABLE IF NOT EXISTS sms_furnace_pollution_checklists (
  id                         SERIAL PRIMARY KEY,
  report_date                DATE         NOT NULL,
  recorded_by                VARCHAR(150) NOT NULL,
  furnace                    VARCHAR(50),
  checks                     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  drive_temperature          NUMERIC(8,2),
  drive_temperature_remark   TEXT,
  currents                   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  remark                     TEXT,
  filled_by                  INTEGER      NOT NULL REFERENCES users(id),
  created_at                 TIMESTAMPTZ  DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_furnace_pollution_date ON sms_furnace_pollution_checklists(report_date);
