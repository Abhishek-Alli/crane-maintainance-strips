// Run once: node run-migration-068.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '068_sms_electrical.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 068 — SMS Electrical Check Sheet...');
    await pool.query(sql);
    console.log('Migration 068 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
