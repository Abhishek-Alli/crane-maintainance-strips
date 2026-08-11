// Run once: node run-migration-038.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '038_hsm_roll_change_activity.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 038 — HSM Mechanical Activities During Roll Change...');
    await pool.query(sql);
    console.log('Migration 038 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
