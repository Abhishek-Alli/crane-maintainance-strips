-- Migration 075: SMS Furnace Side — Furnace Poker check sheet
-- Status checks and motor currents are stored as JSONB; keys live in utils/smsFurnacePokerConfig.js.

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'furnace-poker', 'Furnace Poker', 19
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'furnace-poker'
);

CREATE TABLE IF NOT EXISTS sms_furnace_poker_checklists (
  id           SERIAL PRIMARY KEY,
  report_date  DATE         NOT NULL,
  recorded_by  VARCHAR(150) NOT NULL,
  furnace      VARCHAR(50),
  crucible     VARCHAR(10),
  checks       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  currents     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  remark       TEXT,
  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_furnace_poker_date ON sms_furnace_poker_checklists(report_date);
