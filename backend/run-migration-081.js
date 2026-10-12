// Run once: node run-migration-081.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '079_sms_compressor_pm_compressor.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 081 — SMS Compressor PM compressor column...');
    await pool.query(sql);
    console.log('Migration 081 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
