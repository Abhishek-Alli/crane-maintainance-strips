// Run once: node run-migration-080.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '068_sms_pump_house_motor.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 080 — SMS Pump House Motor Panel...');
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
