// Run once: node run-migration-062.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '062_sms_pump_house.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 062 — SMS Pump House...');
    await pool.query(sql);
    console.log('Migration 062 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
