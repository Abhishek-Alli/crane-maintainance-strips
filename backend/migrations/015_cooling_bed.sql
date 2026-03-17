-- ============================================================
-- Cooling Bed Checksheet Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_cooling_bed_logs (
  id           SERIAL PRIMARY KEY,
  log_date     DATE        NOT NULL,
  log_time     TIME        NOT NULL,
  shift        VARCHAR(10) NOT NULL DEFAULT 'DAY',

  -- Section-1: Twin Channel
  sec1_remark      TEXT,
  sec1_result      VARCHAR(10),
  sec1_checked_by  VARCHAR(100),

  -- Section-2: Rake
  sec2_remark      TEXT,
  sec2_result      VARCHAR(10),
  sec2_checked_by  VARCHAR(100),

  -- Section-3: Aligner Roller
  sec3_remark      TEXT,
  sec3_result      VARCHAR(10),
  sec3_checked_by  VARCHAR(100),

  -- Section-4: Layer Shifting Tray
  sec4_remark      TEXT,
  sec4_result      VARCHAR(10),
  sec4_checked_by  VARCHAR(100),

  -- Section-5: Roller Conveyor
  sec5_remark      TEXT,
  sec5_result      VARCHAR(10),
  sec5_checked_by  VARCHAR(100),

  -- Section-6: Cold Shear
  sec6_remark      TEXT,
  sec6_result      VARCHAR(10),
  sec6_checked_by  VARCHAR(100),

  filled_by    INTEGER     NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hbm_cooling_bed_items (
  id           SERIAL PRIMARY KEY,
  log_id       INTEGER     NOT NULL REFERENCES hbm_cooling_bed_logs(id) ON DELETE CASCADE,
  section_name VARCHAR(30)  NOT NULL,
  block_name   VARCHAR(80)  NOT NULL,
  item_name    VARCHAR(200) NOT NULL,
  status       VARCHAR(10)  NOT NULL CHECK (status IN ('OK', 'NOT_OK')),
  remark       TEXT,
  action_taken TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cb_logs_date ON hbm_cooling_bed_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_cb_items_log ON hbm_cooling_bed_items(log_id);
