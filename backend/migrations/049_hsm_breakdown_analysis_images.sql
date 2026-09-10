-- Migration 049: Images for HSM Breakdown Analysis reports

CREATE TABLE IF NOT EXISTS hsm_breakdown_analysis_images (
  id             SERIAL PRIMARY KEY,
  log_id         INTEGER      NOT NULL REFERENCES hsm_breakdown_analysis_logs(id) ON DELETE CASCADE,
  file_path      VARCHAR(500) NOT NULL,
  original_name  VARCHAR(255),
  mime_type      VARCHAR(100),
  sort_order     INTEGER      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsm_ba_img_log ON hsm_breakdown_analysis_images(log_id);
