-- Migration 081: SMS CCM Pump House — CCM Pump House check sheet
-- Status checks are stored as JSONB ({ key: { value, remark } }); keys live in utils/smsCcmPumpHouseConfig.js.

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'ccm-pump-house', 'CCM Pump House', 14
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'ccm-pump-house'
);

CREATE TABLE IF NOT EXISTS sms_ccm_pump_house_checklists (
  id           SERIAL PRIMARY KEY,
  report_date  DATE         NOT NULL,
  recorded_by  VARCHAR(150) NOT NULL,
  area         VARCHAR(100) NOT NULL,
  sub_area     VARCHAR(100) NOT NULL,
  motor        VARCHAR(150) NOT NULL,
  current_r    NUMERIC(10,2),
  current_y    NUMERIC(10,2),
  current_b    NUMERIC(10,2),
  checks       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  remark       TEXT,
  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_ccm_pump_house_date ON sms_ccm_pump_house_checklists(report_date);
