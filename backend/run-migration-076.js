// Run once: node run-migration-076.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '076_sms_bundle_press.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 076 — SMS Bundle Press...');
    await pool.query(sql);
    console.log('Migration 076 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
