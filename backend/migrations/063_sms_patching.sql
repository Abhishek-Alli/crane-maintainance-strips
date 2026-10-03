-- Migration 062: SMS Patching check sheet (Furnace)
-- Check points are a fixed list in utils/smsPatchingConfig.js, stored as JSONB here. No photos.

-- 1) Permission list item for Create User sheet toggles
INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'patching', 'Patching', 6
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'patching'
);

-- 2) Checklist table
CREATE TABLE IF NOT EXISTS sms_patching_checklists (
  id               SERIAL PRIMARY KEY,
  report_date      DATE         NOT NULL,
  recorded_by      VARCHAR(150) NOT NULL,
  furnace          VARCHAR(20)  NOT NULL,
  crucible         VARCHAR(10)  NOT NULL,
  checklist_items  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  alert_count      INTEGER      NOT NULL DEFAULT 0,
  general_remark   TEXT,
  filled_by        INTEGER      NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_patching_date ON sms_patching_checklists(report_date);
