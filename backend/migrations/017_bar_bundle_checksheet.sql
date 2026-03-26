-- ============================================================
-- Bar Bundle Area Checksheet Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_bar_bundle_logs (
  id           SERIAL PRIMARY KEY,
  log_date     DATE         NOT NULL,
  checked_by   VARCHAR(255),

  -- Section results
  sec1_result  VARCHAR(10),   -- Roller Conveyor
  sec2_result  VARCHAR(10),   -- Kick-Off Mechanisms
  sec3_result  VARCHAR(10),   -- Chain Transfer Beds
  sec4_result  VARCHAR(10),   -- Bending Machine

  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hbm_bar_bundle_items (
  id           SERIAL PRIMARY KEY,
  log_id       INTEGER      NOT NULL REFERENCES hbm_bar_bundle_logs(id) ON DELETE CASCADE,
  section_name VARCHAR(30)  NOT NULL,
  block_name   VARCHAR(100) NOT NULL,
  item_name    VARCHAR(255) NOT NULL,
  status       VARCHAR(10)  NOT NULL CHECK (status IN ('OK', 'NOT_OK', 'OFF')),
  remark       TEXT,
  action_taken TEXT,
  block_remark TEXT,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bb_logs_date ON hbm_bar_bundle_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_bb_items_log  ON hbm_bar_bundle_items(log_id);
