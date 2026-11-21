// Run once: node run-ptm-reasons-migration.js
// Creates the ptm_breakdown_reasons table and seeds the preset reasons (migrations/084_ptm_breakdown_reasons.sql).
// Note: run-migration-084.js is a different, older migration (SMS 082 + 083) — it does not create this table.
// Safe to run more than once (CREATE TABLE IF NOT EXISTS, seed rows use ON CONFLICT DO NOTHING).
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', '084_ptm_breakdown_reasons.sql'), 'utf8');
    console.log('Running 084_ptm_breakdown_reasons.sql...');
    await pool.query(sql);
    const { rows } = await pool.query(
      'SELECT breakdown_type, COUNT(*)::int AS n FROM ptm_breakdown_reasons GROUP BY breakdown_type ORDER BY breakdown_type'
    );
    console.log('Preset reasons:', rows.map((r) => `${r.breakdown_type}: ${r.n}`).join(', '));
    console.log('PTM breakdown reasons migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
