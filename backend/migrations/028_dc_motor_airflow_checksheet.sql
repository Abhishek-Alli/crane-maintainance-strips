-- ============================================================
-- DC Motor Air Flow, Temperature & Vibration Report Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_dc_motor_airflow_logs (
  id           SERIAL PRIMARY KEY,
  log_date     DATE         NOT NULL,
  shift_eng    VARCHAR(100),
  reading_by   VARCHAR(100),
  remark       TEXT,
  filled_by    INTEGER      NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- One row per stand per log
CREATE TABLE IF NOT EXISTS hbm_dc_motor_airflow_entries (
  id                       SERIAL PRIMARY KEY,
  log_id                   INTEGER      NOT NULL REFERENCES hbm_dc_motor_airflow_logs(id) ON DELETE CASCADE,
  stand_name               VARCHAR(100) NOT NULL,
  dc_motor_kw              NUMERIC(10,2),
  blower_kw_rating         NUMERIC(10,2),
  running_kpa              NUMERIC(10,3),
  kpa_status               VARCHAR(10),   -- OK / NOT_OK  (auto: 2.5 <= kpa <= 2.7)
  air_flow_condition       VARCHAR(10),   -- OK / NOT_OK  (manual toggle)
  dc_motor_temp            NUMERIC(10,2),
  dc_motor_temp_status     VARCHAR(10),   -- OK if < 70
  de_bearing_temp          NUMERIC(10,2),
  de_bearing_temp_status   VARCHAR(10),
  nde_bearing_temp         NUMERIC(10,2),
  nde_bearing_temp_status  VARCHAR(10),
  blower_motor_temp        NUMERIC(10,2),
  blower_motor_temp_status VARCHAR(10),
  motor_center_vib         NUMERIC(10,3),
  motor_center_vib_status  VARCHAR(10),   -- OK if < 4
  encoder_side_vib         NUMERIC(10,3),
  encoder_side_vib_status  VARCHAR(10),
  blower_vib               NUMERIC(10,3),
  blower_vib_status        VARCHAR(10),
  created_at               TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hdmaf_date ON hbm_dc_motor_airflow_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_hdmae_log  ON hbm_dc_motor_airflow_entries(log_id);
