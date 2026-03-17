-- ============================================================
-- Rolling Stand Checksheet Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_rolling_stand_logs (
  id           SERIAL PRIMARY KEY,
  log_date     DATE        NOT NULL,
  log_time     TIME        NOT NULL,
  shift        VARCHAR(10) NOT NULL DEFAULT 'DAY',

  -- Section-1 (ROUGHING STAND) footer fields
  sec1_remark      TEXT,
  sec1_result      VARCHAR(10),   -- 'OK' | 'NOT_OK'
  sec1_checked_by  VARCHAR(100),

  -- Section-2 (C1–C14) footer fields
  sec2_remark      TEXT,
  sec2_result      VARCHAR(10),
  sec2_checked_by  VARCHAR(100),

  filled_by    INTEGER     NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hbm_rolling_stand_items (
  id           SERIAL PRIMARY KEY,
  log_id       INTEGER     NOT NULL REFERENCES hbm_rolling_stand_logs(id) ON DELETE CASCADE,
  section_name VARCHAR(20) NOT NULL,   -- 'SECTION-1' | 'SECTION-2'
  block_name   VARCHAR(50) NOT NULL,   -- 'ROUGHING STAND' | 'C1'–'C14'
  item_name    VARCHAR(200) NOT NULL,
  status       VARCHAR(10) NOT NULL CHECK (status IN ('OK', 'NOT_OK')),
  remark       TEXT,
  action_taken TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rs_logs_date  ON hbm_rolling_stand_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_rs_items_log  ON hbm_rolling_stand_items(log_id);
