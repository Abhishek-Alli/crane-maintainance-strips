-- ============================================================
-- Visual Inspection & HBM Transformer Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_transformer_logs (
  id           SERIAL PRIMARY KEY,
  log_date     DATE        NOT NULL,
  sec2_remark  TEXT,
  sec3_remark  TEXT,
  filled_by    INTEGER     NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Section 1: Visual inspection — one row per transformer unit
CREATE TABLE IF NOT EXISTS hbm_transformer_sec1 (
  id                   SERIAL PRIMARY KEY,
  log_id               INTEGER       NOT NULL REFERENCES hbm_transformer_logs(id) ON DELETE CASCADE,
  unit_name            VARCHAR(50)   NOT NULL,   -- '8 MVA DC' | '4 MVA DC'
  rated_current        NUMERIC(10,2),
  ct_ratio             VARCHAR(50),
  bar_size             VARCHAR(50),
  ht_current           NUMERIC(10,2),
  ht_volt              NUMERIC(10,2),
  tap_count_diff       NUMERIC(10,2),
  tap_position         NUMERIC(10,2),
  wind_temperature     NUMERIC(10,2),
  oil_temperature      NUMERIC(10,2),
  main_tank_oil_level  NUMERIC(10,2),
  oltc_oil_level       NUMERIC(10,2),
  silica_gel_color     VARCHAR(100),
  cleaning             VARCHAR(20),   -- OK / NOT_OK
  electric_inspection  VARCHAR(20),
  mech_inspection      VARCHAR(20),   -- Checked / Not_Checked
  relay_condition      VARCHAR(20),
  meter_condition      VARCHAR(20),
  indicator            VARCHAR(20),
  announce_meter       VARCHAR(20),
  oil_leakage          VARCHAR(10),   -- YES / NO
  tnc_operation        VARCHAR(20),   -- Checked / Not_Checked
  dc_supply            VARCHAR(20),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Section 2: OLTC Daily Report
CREATE TABLE IF NOT EXISTS hbm_transformer_sec2 (
  id                   SERIAL PRIMARY KEY,
  log_id               INTEGER       NOT NULL REFERENCES hbm_transformer_logs(id) ON DELETE CASCADE,
  unit_name            VARCHAR(50)   NOT NULL,   -- '8 MVA' | '4 MVA'
  today_tap_count      NUMERIC(10,2),
  yesterday_tap_count  NUMERIC(10,2),
  difference           NUMERIC(10,2),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Section 3: KWH & KVAH Daily Report
CREATE TABLE IF NOT EXISTS hbm_transformer_sec3 (
  id              SERIAL PRIMARY KEY,
  log_id          INTEGER       NOT NULL REFERENCES hbm_transformer_logs(id) ON DELETE CASCADE,
  unit_name       VARCHAR(50)   NOT NULL,
  today_kwh       NUMERIC(10,2),
  yesterday_kwh   NUMERIC(10,2),
  diff_kwh        NUMERIC(10,2),
  today_kvah      NUMERIC(10,2),
  yesterday_kvah  NUMERIC(10,2),
  diff_kvah       NUMERIC(10,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_htl_date  ON hbm_transformer_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_hts1_log  ON hbm_transformer_sec1(log_id);
CREATE INDEX IF NOT EXISTS idx_hts2_log  ON hbm_transformer_sec2(log_id);
CREATE INDEX IF NOT EXISTS idx_hts3_log  ON hbm_transformer_sec3(log_id);
