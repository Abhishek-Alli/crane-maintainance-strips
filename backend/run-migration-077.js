// Run once: node run-migration-077.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '077_sms_furnace_transformer.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 077 — SMS Furnace Transformer...');
    await pool.query(sql);
    console.log('Migration 077 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
