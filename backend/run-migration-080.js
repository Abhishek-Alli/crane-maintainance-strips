// Run once: node run-migration-080.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '080_sms_dg_checks.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 080 — SMS DG checks column...');
    await pool.query(sql);
    console.log('Migration 080 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
