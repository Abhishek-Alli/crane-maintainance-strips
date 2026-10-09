-- Migration 074: SMS Furnace Side — Furnace Stand By check sheet
-- Status checks are stored as JSONB ({ key: { value, remark } }); keys live in utils/smsFurnaceStandByConfig.js.

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'furnace-stand-by', 'Furnace Stand By', 18
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'furnace-stand-by'
);

CREATE TABLE IF NOT EXISTS sms_furnace_stand_by_checklists (
  id           SERIAL PRIMARY KEY,
  report_date  DATE         NOT NULL,
  recorded_by  VARCHAR(150) NOT NULL,
  furnace      VARCHAR(50),
  crucible     VARCHAR(10),
  checks       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  remark       TEXT,
  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_furnace_stand_by_date ON sms_furnace_stand_by_checklists(report_date);
