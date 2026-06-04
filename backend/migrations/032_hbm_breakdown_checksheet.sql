-- ============================================================
-- HBM Breakdown Report Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS hbm_breakdown_logs (
  id          SERIAL PRIMARY KEY,
  log_date    DATE         NOT NULL,
  size        VARCHAR(30)  NOT NULL,
  filled_by   INTEGER      NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- One row per hourly slot (24 slots: 08:00→08:00 next day)
CREATE TABLE IF NOT EXISTS hbm_breakdown_slots (
  id           SERIAL PRIMARY KEY,
  log_id       INTEGER      NOT NULL REFERENCES hbm_breakdown_logs(id) ON DELETE CASCADE,
  slot_label   VARCHAR(15)  NOT NULL,   -- e.g. "08:00-09:00"
  slot_order   INTEGER      NOT NULL,   -- 1-24
  miss_roll    INTEGER,
  miss_roll_18 INTEGER,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Multiple breakdown entries per slot
CREATE TABLE IF NOT EXISTS hbm_breakdown_entries (
  id                SERIAL PRIMARY KEY,
  slot_id           INTEGER      NOT NULL REFERENCES hbm_breakdown_slots(id) ON DELETE CASCADE,
  breakdown_type    VARCHAR(100) NOT NULL,
  breakdown_minutes INTEGER,
  breakdown_reason  TEXT,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hbl_date    ON hbm_breakdown_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_hbs_log     ON hbm_breakdown_slots(log_id);
CREATE INDEX IF NOT EXISTS idx_hbe_slot    ON hbm_breakdown_entries(slot_id);
