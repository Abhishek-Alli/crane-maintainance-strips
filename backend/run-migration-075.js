// Run once: node run-migration-075.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '075_sms_furnace_poker.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 075 — SMS Furnace Poker...');
    await pool.query(sql);
    console.log('Migration 075 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
