-- Migration 051: Images for HSM FM Daily Check List

CREATE TABLE IF NOT EXISTS hsm_fm_daily_images (
  id             SERIAL PRIMARY KEY,
  log_id         INTEGER      NOT NULL REFERENCES hsm_fm_daily_checklists(id) ON DELETE CASCADE,
  file_path      VARCHAR(500) NOT NULL,
  original_name  VARCHAR(255),
  mime_type      VARCHAR(100),
  sort_order     INTEGER      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsm_fm_daily_img_log ON hsm_fm_daily_images(log_id);
