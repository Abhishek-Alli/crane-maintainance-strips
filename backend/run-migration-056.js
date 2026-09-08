// Run once: node run-migration-056.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '056_hsm_rm_daily_section_values.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 056 — RM Daily section_values column...');
    await pool.query(sql);
    console.log('Migration 056 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
