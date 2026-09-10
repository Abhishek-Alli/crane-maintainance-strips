// Run once: node run-migration-045.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '045_hsm_induction_daily_checklist.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 045 — HSM Induction Daily Check List...');
    await pool.query(sql);
    console.log('Migration 045 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
