-- ============================================================
-- Mill Mechanical Checksheet Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_mill_mech_logs (
  id           SERIAL PRIMARY KEY,
  log_date     DATE        NOT NULL,
  log_time     TIME        NOT NULL,
  shift        VARCHAR(10) NOT NULL DEFAULT 'DAY',

  -- Section-1: Shear Machine
  sec1_remark      TEXT,
  sec1_result      VARCHAR(10),
  sec1_checked_by  VARCHAR(100),

  -- Section-2: Pinch Roll & Tail Breaker
  sec2_remark      TEXT,
  sec2_result      VARCHAR(10),
  sec2_checked_by  VARCHAR(100),

  -- Section-3: Looper
  sec3_remark      TEXT,
  sec3_result      VARCHAR(10),
  sec3_checked_by  VARCHAR(100),

  -- Section-4: Quenching Box
  sec4_remark      TEXT,
  sec4_result      VARCHAR(10),
  sec4_checked_by  VARCHAR(100),

  -- Section-5: Shifter
  sec5_remark      TEXT,
  sec5_result      VARCHAR(10),
  sec5_checked_by  VARCHAR(100),

  filled_by    INTEGER     NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hbm_mill_mech_items (
  id           SERIAL PRIMARY KEY,
  log_id       INTEGER     NOT NULL REFERENCES hbm_mill_mech_logs(id) ON DELETE CASCADE,
  section_name VARCHAR(30) NOT NULL,
  block_name   VARCHAR(80) NOT NULL,
  item_name    VARCHAR(200) NOT NULL,
  status       VARCHAR(10) NOT NULL CHECK (status IN ('OK', 'NOT_OK')),
  remark       TEXT,
  action_taken TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mm_logs_date ON hbm_mill_mech_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_mm_items_log ON hbm_mill_mech_items(log_id);
