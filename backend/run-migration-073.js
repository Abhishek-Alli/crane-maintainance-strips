// Run once: node run-migration-073.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '073_sms_furnace_pollution.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 073 — SMS Furnace Pollution...');
    await pool.query(sql);
    console.log('Migration 073 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
