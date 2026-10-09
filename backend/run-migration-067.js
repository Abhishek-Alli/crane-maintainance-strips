// Run once: node run-migration-067.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '067_sms_ccm_motor.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 067 — SMS CCM Motor...');
    await pool.query(sql);
    console.log('Migration 067 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
