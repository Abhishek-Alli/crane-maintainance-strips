-- ============================================================
-- Pump House Water Parameters Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_water_param_logs (
  id           SERIAL PRIMARY KEY,
  log_date     DATE         NOT NULL,
  remark       TEXT,
  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- One row per water source per log
CREATE TABLE IF NOT EXISTS hbm_water_param_entries (
  id               SERIAL PRIMARY KEY,
  log_id           INTEGER       NOT NULL REFERENCES hbm_water_param_logs(id) ON DELETE CASCADE,
  water_source     VARCHAR(100)  NOT NULL,
  source_status    VARCHAR(10),           -- ON / OFF (for RO / RO Waste sources)
  tds              NUMERIC(10,2),
  tds_status       VARCHAR(10),           -- OK / NOT_OK
  hardness         NUMERIC(10,2),
  hardness_status  VARCHAR(10),           -- OK / NOT_OK
  ph               NUMERIC(10,3),
  ph_status        VARCHAR(10),           -- OK / NOT_OK
  temperature      NUMERIC(10,2),
  temp_status      VARCHAR(10),           -- OK / NOT_OK
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hwpl_date ON hbm_water_param_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_hwpe_log  ON hbm_water_param_entries(log_id);
