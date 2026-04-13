-- ============================================================
-- Pump Parameter Report Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_pump_param_logs (
  id           SERIAL PRIMARY KEY,
  log_date     DATE         NOT NULL,
  size_value   VARCHAR(100),
  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Section-1: One row per pump entry
CREATE TABLE IF NOT EXISTS hbm_pump_param_entries (
  id            SERIAL PRIMARY KEY,
  log_id        INTEGER       NOT NULL REFERENCES hbm_pump_param_logs(id) ON DELETE CASCADE,
  pump_name     VARCHAR(100)  NOT NULL,
  drive_details VARCHAR(50),           -- VFD / Soft Starter / Star Delta
  status        VARCHAR(10),           -- ON / OFF
  kw            NUMERIC(10,2),
  amp           NUMERIC(10,2),
  rpm           NUMERIC(10,2),
  pressure      NUMERIC(10,2),
  load_pct      NUMERIC(10,2),
  kwh_diff      NUMERIC(10,2),
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- Section-2: Meter readings and misc items
CREATE TABLE IF NOT EXISTS hbm_pump_param_sec2 (
  id           SERIAL PRIMARY KEY,
  log_id       INTEGER       NOT NULL REFERENCES hbm_pump_param_logs(id) ON DELETE CASCADE,
  item_name    VARCHAR(255)  NOT NULL,
  value_text   VARCHAR(255),           -- numeric reading or free text
  item_status  VARCHAR(10),            -- OK / NOT_OK (only for applicable items)
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppl_date  ON hbm_pump_param_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_ppe_log   ON hbm_pump_param_entries(log_id);
CREATE INDEX IF NOT EXISTS idx_pps2_log  ON hbm_pump_param_sec2(log_id);
