// Run once: node run-migration-064.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '064_sms_ladle_car.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 064 — SMS Ladle Car...');
    await pool.query(sql);
    console.log('Migration 064 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
