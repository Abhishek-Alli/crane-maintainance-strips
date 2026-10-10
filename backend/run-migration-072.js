// Run once: node run-migration-072.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '072_sms_compressor_pm.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 072 — SMS Compressor PM...');
    await pool.query(sql);
    console.log('Migration 072 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
