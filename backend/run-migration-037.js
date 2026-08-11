// Run once: node run-migration-037.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '037_hsm_breakdown_analysis.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 037 — HSM Breakdown Analysis Report...');
    await pool.query(sql);
    console.log('Migration 037 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
