-- Migration 065: SMS Pollution check sheet (Pollution Mechanical)
-- Check points are a fixed list in utils/smsPollutionConfig.js, stored as JSONB here.

-- 1) Permission list item for Create User sheet toggles
INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'pollution', 'Pollution - Daily Check Sheet', 9
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'pollution'
);

-- 2) Checklist table
CREATE TABLE IF NOT EXISTS sms_pollution_checklists (
  id               SERIAL PRIMARY KEY,
  report_date      DATE         NOT NULL,
  recorded_by      VARCHAR(150) NOT NULL,
  furnace          VARCHAR(20)  NOT NULL,
  checklist_items  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  alert_count      INTEGER      NOT NULL DEFAULT 0,
  filled_by        INTEGER      NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_pollution_date ON sms_pollution_checklists(report_date);

-- 3) Photos, each tied to one check point key
CREATE TABLE IF NOT EXISTS sms_pollution_images (
  id             SERIAL PRIMARY KEY,
  log_id         INTEGER      NOT NULL REFERENCES sms_pollution_checklists(id) ON DELETE CASCADE,
  item_key       VARCHAR(100) NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  original_name  VARCHAR(255),
  mime_type      VARCHAR(100),
  sort_order     INTEGER      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_pollution_img_log ON sms_pollution_images(log_id);
