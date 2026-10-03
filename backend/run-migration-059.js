// Run once: node run-migration-059.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '059_sms_eot_crane_maintenance.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 059 — SMS EOT Crane Maintenance...');
    await pool.query(sql);
    console.log('Migration 059 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
