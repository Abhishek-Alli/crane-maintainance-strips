// Run once: node run-migration-070.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '070_sms_furnace_pollution_pm.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 070 — SMS Furnace Pollution PM...');
    await pool.query(sql);
    console.log('Migration 070 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
