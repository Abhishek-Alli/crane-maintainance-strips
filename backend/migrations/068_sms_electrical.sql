-- Migration 068: SMS Electrical Daily Check Sheet

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'electrical', 'Electrical Daily Check Sheet', 10
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'electrical'
);

CREATE TABLE IF NOT EXISTS sms_electrical_checklists (
  id               SERIAL PRIMARY KEY,
  report_date      DATE         NOT NULL,
  shift            VARCHAR(1)   NOT NULL CHECK (shift IN ('A','B','C')),
  recorded_by      VARCHAR(150) NOT NULL,
  area             VARCHAR(100),
  checklist_items  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  alert_count      INTEGER      NOT NULL DEFAULT 0,
  general_remark   TEXT,
  filled_by        INTEGER      NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_electrical_date ON sms_electrical_checklists(report_date);

CREATE TABLE IF NOT EXISTS sms_electrical_images (
  id             SERIAL PRIMARY KEY,
  log_id         INTEGER      NOT NULL REFERENCES sms_electrical_checklists(id) ON DELETE CASCADE,
  item_key       VARCHAR(100) NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  original_name  VARCHAR(255),
  mime_type      VARCHAR(100),
  sort_order     INTEGER      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_electrical_img_log ON sms_electrical_images(log_id);
