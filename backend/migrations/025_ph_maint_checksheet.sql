-- ============================================================
-- Pump House Maintenance Work Sheet Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_ph_maint_logs (
  id          SERIAL PRIMARY KEY,
  log_date    DATE        NOT NULL,
  filled_by   INTEGER     NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- One row per maintenance work point
CREATE TABLE IF NOT EXISTS hbm_ph_maint_items (
  id          SERIAL PRIMARY KEY,
  log_id      INTEGER     NOT NULL REFERENCES hbm_ph_maint_logs(id) ON DELETE CASCADE,
  item_no     INTEGER     NOT NULL,
  item_text   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hpml_date ON hbm_ph_maint_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_hpmi_log  ON hbm_ph_maint_items(log_id);
