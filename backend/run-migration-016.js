// Run this once: node run-migration-016.js
const { pool } = require('./config/database');
require('dotenv').config();

const sql = `
CREATE TABLE IF NOT EXISTS hbm_pumphouse_logs (
  id           SERIAL PRIMARY KEY,
  log_date     DATE         NOT NULL,
  checked_by   VARCHAR(255),
  sec1_result   VARCHAR(10),
  sec2_result   VARCHAR(10),
  sec3_result   VARCHAR(10),
  sec4_result   VARCHAR(10),
  sec5_result   VARCHAR(10),
  sec6_result   VARCHAR(10),
  sec7_result   VARCHAR(10),
  sec8_result   VARCHAR(10),
  sec9_result   VARCHAR(10),
  sec10_result  VARCHAR(10),
  sec11_result  VARCHAR(10),
  sec12_result  VARCHAR(10),
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
`;

async function run() {
  try {
    console.log('Running migration 016 — Pumphouse Checksheet...');
    await pool.query(sql);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

run();
