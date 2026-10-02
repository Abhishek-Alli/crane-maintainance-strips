// Run once: node run-migration-063.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '063_sms_scrap_trolly.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 063 — SMS Scrap Transfer Trolly...');
    await pool.query(sql);
    console.log('Migration 063 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
