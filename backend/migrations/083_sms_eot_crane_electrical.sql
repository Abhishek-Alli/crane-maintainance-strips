-- Migration 083: SMS Electrical — EOT Crane electrical maintenance check sheet
-- Points are stored as JSONB ({ section: { point: { value, remark } | { r, y, b, remark } } }); keys live in utils/smsEotCraneElectricalConfig.js.

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'eot-crane-electrical', 'EOT Crane — Electrical', 22
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'eot-crane-electrical'
);

CREATE TABLE IF NOT EXISTS sms_eot_crane_electrical_checklists (
  id                  SERIAL PRIMARY KEY,
  report_date         DATE         NOT NULL,
  recorded_by         VARCHAR(150) NOT NULL,
  shed_name           VARCHAR(50)  NOT NULL,
  crane_number        VARCHAR(10)  NOT NULL,
  items               JSONB        NOT NULL DEFAULT '{}'::jsonb,
  skipped_sections    JSONB        NOT NULL DEFAULT '[]'::jsonb,
  remark              TEXT,
  maintenance_start   VARCHAR(16)  NOT NULL,
  maintenance_end     VARCHAR(16)  NOT NULL,
  filled_by           INTEGER      NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_eot_crane_electrical_date ON sms_eot_crane_electrical_checklists(report_date);
