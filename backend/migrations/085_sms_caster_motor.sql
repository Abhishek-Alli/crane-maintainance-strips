-- Migration 085: SMS Billet/Slab Caster — motor current sheets (Billet Strand 1 first)
-- One table for all strands; `sheet` is the strand key (utils/smsCasterMotorConfig.js).
-- readings is JSONB: { motorKey: { value, remark } }

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'billet-strand-1', 'Billet Caster Strand 1',
       COALESCE((SELECT MAX(display_order) FROM app_permission_lists WHERE module_code = 'SMS_CHECKSHEETS'), 0) + 1
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'billet-strand-1'
);

CREATE TABLE IF NOT EXISTS sms_caster_motor_checklists (
  id           SERIAL PRIMARY KEY,
  sheet        VARCHAR(50)  NOT NULL,
  report_date  DATE         NOT NULL,
  recorded_by  VARCHAR(150) NOT NULL,
  readings     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  remark       TEXT,
  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_caster_motor_sheet_date ON sms_caster_motor_checklists(sheet, report_date);
