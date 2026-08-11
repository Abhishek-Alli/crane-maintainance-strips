-- Migration 040: HSM Delay Report

INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
SELECT 'HSM_CHECKSHEETS', 'delay-report', 'Delay Report', 3
WHERE NOT EXISTS (
  SELECT 1 FROM app_permission_lists
  WHERE module_code = 'HSM_CHECKSHEETS' AND item_key = 'delay-report'
);

CREATE TABLE IF NOT EXISTS hsm_delay_reports (
  id                  SERIAL PRIMARY KEY,
  report_date         DATE         NOT NULL,
  shift               VARCHAR(10)  NOT NULL,
  start_time          TIME,
  end_time            TIME,
  total_minutes       INTEGER,
  reason              TEXT,
  agency              VARCHAR(200),

  hotout_source       VARCHAR(200),
  hotout_thickness    VARCHAR(100),
  hotout_width        VARCHAR(100),
  hotout_length       VARCHAR(100),
  hotout_pieces       VARCHAR(100),
  hotout_mt           VARCHAR(100),
  hotout_remark       TEXT,

  miss_thickness      VARCHAR(100),
  miss_width          VARCHAR(100),
  miss_length         VARCHAR(100),
  miss_pieces         VARCHAR(100),
  miss_mt             VARCHAR(100),
  miss_location       VARCHAR(200),
  miss_operator_name  VARCHAR(150),
  miss_remark         TEXT,

  filled_by           INTEGER      NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hsm_delay_report_date ON hsm_delay_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_hsm_delay_shift ON hsm_delay_reports(shift);
