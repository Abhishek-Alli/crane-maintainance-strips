-- Migration 077: SMS Furnace Side — Furnace Transformer check sheet
-- Status checks are stored as JSONB ({ key: { value, remark } }); keys live in utils/smsFurnaceTransformerConfig.js.

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'furnace-transformer', 'Furnace Transformer', 21
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'furnace-transformer'
);

CREATE TABLE IF NOT EXISTS sms_furnace_transformer_checklists (
  id                SERIAL PRIMARY KEY,
  report_date       DATE         NOT NULL,
  recorded_by       VARCHAR(150) NOT NULL,
  transformer       VARCHAR(100),
  checks            JSONB        NOT NULL DEFAULT '{}'::jsonb,
  oti_temperature   NUMERIC(8,2),
  oti_remark        TEXT,
  wti_temperature   NUMERIC(8,2),
  wti_remark        TEXT,
  remark            TEXT,
  filled_by         INTEGER      NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_furnace_transformer_date ON sms_furnace_transformer_checklists(report_date);
