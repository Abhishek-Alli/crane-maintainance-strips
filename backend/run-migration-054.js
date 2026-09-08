// Run once: node run-migration-054.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '054_hsm_dc_daily_section_values.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 054 — DC Daily section_values column...');
    await pool.query(sql);
    console.log('Migration 054 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
