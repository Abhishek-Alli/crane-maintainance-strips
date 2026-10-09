-- Migration 067: SMS Billet and Slab Caster — CCM Motor check sheet
-- Status checks are stored as JSONB ({ key: { value, remark } }); keys live in utils/smsCcmMotorConfig.js.

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'ccm-motor', 'CCM Motor', 11
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'ccm-motor'
);

CREATE TABLE IF NOT EXISTS sms_ccm_motor_checklists (
  id           SERIAL PRIMARY KEY,
  report_date  DATE         NOT NULL,
  recorded_by  VARCHAR(150) NOT NULL,
  stand        VARCHAR(100) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_sms_ccm_motor_date ON sms_ccm_motor_checklists(report_date);
