-- Migration 076: SMS Furnace Side — Bundle Press check sheet
-- Status checks and motor currents are stored as JSONB; keys live in utils/smsBundlePressConfig.js.

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'bundle-press', 'Bundle Press', 20
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'bundle-press'
);

CREATE TABLE IF NOT EXISTS sms_bundle_press_checklists (
  id           SERIAL PRIMARY KEY,
  report_date  DATE         NOT NULL,
  recorded_by  VARCHAR(150) NOT NULL,
  currents     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  checks       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  remark       TEXT,
  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_bundle_press_date ON sms_bundle_press_checklists(report_date);
