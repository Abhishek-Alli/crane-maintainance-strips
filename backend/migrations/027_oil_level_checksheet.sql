-- ============================================================
-- Daily Oil Level Sheet Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_oil_level_logs (
  id           SERIAL PRIMARY KEY,
  log_date     DATE         NOT NULL,
  shift_eng    VARCHAR(100),
  reading_by   VARCHAR(100),
  remark       TEXT,
  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- One row per tank per log
CREATE TABLE IF NOT EXISTS hbm_oil_level_entries (
  id           SERIAL PRIMARY KEY,
  log_id       INTEGER      NOT NULL REFERENCES hbm_oil_level_logs(id) ON DELETE CASCADE,
  tank_name    VARCHAR(100) NOT NULL,
  oil_level    NUMERIC(10,2),
  oil_status   VARCHAR(10),   -- OK / NOT_OK  (auto-derived from threshold)
  pressure     NUMERIC(10,2),
  temperature  NUMERIC(10,2),
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holl_date ON hbm_oil_level_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_hole_log  ON hbm_oil_level_entries(log_id);
