// Run once: node run-migration-046.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '046_hsm_dc_daily_checklist.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 046 — HSM DC Daily Check List...');
    await pool.query(sql);
    console.log('Migration 046 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
