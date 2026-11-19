// Run once: node run-migration-090.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '090_telegram_crane_subscription.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 090 — Telegram crane subscription...');
    await pool.query(sql);
    console.log('Migration 090 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
