// Run once: node run-migration-078.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '078_sms_furnace_motor_panel.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 078 — SMS Furnace Motor Panel...');
    await pool.query(sql);
    console.log('Migration 078 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
