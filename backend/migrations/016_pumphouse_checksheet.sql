-- ============================================================
-- Pumphouse Checksheet Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_pumphouse_logs (
  id           SERIAL PRIMARY KEY,
  log_date     DATE         NOT NULL,
  checked_by   VARCHAR(255),

  -- Section results
  sec1_result   VARCHAR(10),   -- TMT & Mill Water Pump
  sec2_result   VARCHAR(10),   -- Scale Pit Pump
  sec3_result   VARCHAR(10),   -- ICW Pump
  sec4_result   VARCHAR(10),   -- DCW Pump
  sec5_result   VARCHAR(10),   -- Laminar Hot/Cold/Cross Spray
  sec6_result   VARCHAR(10),   -- Backwash Pump
  sec7_result   VARCHAR(10),   -- Bearing Cooling Pump
  sec8_result   VARCHAR(10),   -- Reverse Osmosis
  sec9_result   VARCHAR(10),   -- Sandfilter Blower & Sandfilter
  sec10_result  VARCHAR(10),   -- Oxygen Plant
  sec11_result  VARCHAR(10),   -- Compressor
  sec12_result  VARCHAR(10),   -- Cooling Tower

  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hbm_pumphouse_items (
  id           SERIAL PRIMARY KEY,
  log_id       INTEGER      NOT NULL REFERENCES hbm_pumphouse_logs(id) ON DELETE CASCADE,
  section_name VARCHAR(30)  NOT NULL,
  block_name   VARCHAR(100) NOT NULL,
  item_name    VARCHAR(255) NOT NULL,
  status       VARCHAR(10)  NOT NULL CHECK (status IN ('OK', 'NOT_OK', 'OFF')),
  remark       TEXT,
  action_taken TEXT,
  block_remark TEXT,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ph_logs_date ON hbm_pumphouse_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_ph_items_log  ON hbm_pumphouse_items(log_id);
