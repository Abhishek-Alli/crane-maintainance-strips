-- Migration 050: Images for HSM Delay Reports

CREATE TABLE IF NOT EXISTS hsm_delay_report_images (
  id             SERIAL PRIMARY KEY,
  log_id         INTEGER      NOT NULL REFERENCES hsm_delay_reports(id) ON DELETE CASCADE,
  file_path      VARCHAR(500) NOT NULL,
  original_name  VARCHAR(255),
  mime_type      VARCHAR(100),
  sort_order     INTEGER      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsm_dr_img_log ON hsm_delay_report_images(log_id);
