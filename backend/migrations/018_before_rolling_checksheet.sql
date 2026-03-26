-- ============================================================
-- HBM Before Rolling Checksheet Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_before_rolling_logs (
  id                    SERIAL PRIMARY KEY,
  log_date              DATE         NOT NULL,
  checked_by            VARCHAR(255),
  mill_shift_incharge   VARCHAR(255),
  mechanical_engineer   VARCHAR(255),

  -- Section results
  sec1_result  VARCHAR(10),   -- Rolling Stands C1-C14
  sec2_result  VARCHAR(10),   -- Loopers & Snapshears
  sec3_result  VARCHAR(10),   -- Pinch Rolls & Tail Breakers
  sec4_result  VARCHAR(10),   -- Flying / Continue Shear

  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hbm_before_rolling_items (
  id           SERIAL PRIMARY KEY,
  log_id       INTEGER      NOT NULL REFERENCES hbm_before_rolling_logs(id) ON DELETE CASCADE,
  section_name VARCHAR(30)  NOT NULL,
  block_name   VARCHAR(100) NOT NULL,
  item_name    VARCHAR(255) NOT NULL,
  item_value   TEXT,                        -- optional value fill-in
  status       VARCHAR(10)  NOT NULL CHECK (status IN ('OK', 'NOT_OK', 'OFF')),
  remark       TEXT,
  action_taken TEXT,
  block_remark TEXT,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_br_logs_date  ON hbm_before_rolling_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_br_items_log  ON hbm_before_rolling_items(log_id);
