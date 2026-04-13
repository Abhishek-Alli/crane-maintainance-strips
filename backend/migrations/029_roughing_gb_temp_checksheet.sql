-- ============================================================
-- Roughing Stand & Gearbox Bearing Temperature Analysis Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_roughing_gb_temp_logs (
  id               SERIAL PRIMARY KEY,
  log_date         DATE         NOT NULL,
  shift_eng        VARCHAR(100),
  temp_taken_by    VARCHAR(100),

  -- Section-1: Flywheel
  s1_flywheel_de        NUMERIC(10,2),
  s1_flywheel_nde       NUMERIC(10,2),

  -- Section-1: Reduction GB
  s1_reduction_de       NUMERIC(10,2),
  s1_reduction_nde      NUMERIC(10,2),
  s1_reduction_output   NUMERIC(10,2),

  -- Section-1: Pinion GB
  s1_pinion_de_top      NUMERIC(10,2),
  s1_pinion_de_mid      NUMERIC(10,2),
  s1_pinion_de_bot      NUMERIC(10,2),
  s1_pinion_nde_top     NUMERIC(10,2),
  s1_pinion_nde_mid     NUMERIC(10,2),
  s1_pinion_nde_bot     NUMERIC(10,2),

  -- Section-1: Stand
  s1_stand_de_top       NUMERIC(10,2),
  s1_stand_de_mid       NUMERIC(10,2),
  s1_stand_de_bot       NUMERIC(10,2),
  s1_stand_nde_top      NUMERIC(10,2),
  s1_stand_nde_mid      NUMERIC(10,2),
  s1_stand_nde_bot      NUMERIC(10,2),

  sec1_remark      TEXT,
  sec2_remark      TEXT,
  sec3_remark      TEXT,

  filled_by        INTEGER      NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- One row per C-stand (C-1 to C-14) per log
-- Section-2: Gearbox Bearing Temperature
-- Section-3: Stand Bearing Temperature
CREATE TABLE IF NOT EXISTS hbm_roughing_gb_temp_stands (
  id               SERIAL PRIMARY KEY,
  log_id           INTEGER      NOT NULL REFERENCES hbm_roughing_gb_temp_logs(id) ON DELETE CASCADE,
  stand_name       VARCHAR(10)  NOT NULL,   -- C-1 .. C-14

  -- Section-2 columns
  gb_de            NUMERIC(10,2),
  gb_inter         NUMERIC(10,2),
  gb_output_top    NUMERIC(10,2),
  gb_output_bot    NUMERIC(10,2),
  gb_gearbox       NUMERIC(10,2),

  -- Section-3 columns
  s_de_top         NUMERIC(10,2),
  s_de_bot         NUMERIC(10,2),
  s_nde_top        NUMERIC(10,2),
  s_nde_bot        NUMERIC(10,2),

  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hrgt_date  ON hbm_roughing_gb_temp_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_hrgts_log  ON hbm_roughing_gb_temp_stands(log_id);
