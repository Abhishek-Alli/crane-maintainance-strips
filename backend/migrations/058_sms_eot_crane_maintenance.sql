-- Migration 058: SMS EOT Crane Maintenance (Mechanical) checklist + schedule calendar
-- Sheds/cranes are a fixed list in utils/smsEotCraneConfig.js, so they are stored by name here.

-- 1) Permission list item for Create User sheet toggles
INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'SMS_CHECKSHEETS', 'eot-crane-maintenance', 'EOT Crane Maintenance', 2
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'SMS_CHECKSHEETS' AND item_key = 'eot-crane-maintenance'
);

-- 2) Planned maintenance (calendar); id is the "Schedule ID"
CREATE TABLE IF NOT EXISTS sms_eot_crane_schedules (
  id             SERIAL PRIMARY KEY,
  shed_name      VARCHAR(50)  NOT NULL,
  crane_number   VARCHAR(20)  NOT NULL,
  planned_date   DATE         NOT NULL,
  created_by     INTEGER      NOT NULL REFERENCES users(id),
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (shed_name, crane_number, planned_date)
);

CREATE INDEX IF NOT EXISTS idx_sms_eot_sched_date ON sms_eot_crane_schedules(planned_date);

-- 3) Checklist table — one checklist per crane per day
CREATE TABLE IF NOT EXISTS sms_eot_crane_checklists (
  id                      SERIAL PRIMARY KEY,
  schedule_id             INTEGER      UNIQUE REFERENCES sms_eot_crane_schedules(id) ON DELETE SET NULL,
  report_date             DATE         NOT NULL,
  recorded_by             VARCHAR(150) NOT NULL,
  shed_name               VARCHAR(50)  NOT NULL,
  crane_number            VARCHAR(20)  NOT NULL,
  crane_capacity          VARCHAR(20),
  checklist_items         JSONB        NOT NULL DEFAULT '{}'::jsonb,
  skipped_sections        JSONB        NOT NULL DEFAULT '[]'::jsonb,
  alert_count             INTEGER      NOT NULL DEFAULT 0,
  general_remark          TEXT,
  maintenance_start_time  TIME,
  maintenance_stop_time   TIME,
  filled_by               INTEGER      NOT NULL REFERENCES users(id),
  created_at              TIMESTAMPTZ  DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (shed_name, crane_number, report_date)
);

CREATE INDEX IF NOT EXISTS idx_sms_eot_crane_date ON sms_eot_crane_checklists(report_date);

-- 4) Photos, each tied to one checklist point ("section_key.point_key")
CREATE TABLE IF NOT EXISTS sms_eot_crane_images (
  id             SERIAL PRIMARY KEY,
  log_id         INTEGER      NOT NULL REFERENCES sms_eot_crane_checklists(id) ON DELETE CASCADE,
  item_key       VARCHAR(100) NOT NULL,
  file_path      VARCHAR(500) NOT NULL,
  original_name  VARCHAR(255),
  mime_type      VARCHAR(100),
  sort_order     INTEGER      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_eot_crane_img_log ON sms_eot_crane_images(log_id);
