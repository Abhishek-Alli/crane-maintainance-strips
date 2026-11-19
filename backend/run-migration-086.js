// Run once: node run-migration-086.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '086_sms_billet_strand_2.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 086 — SMS Billet Strand 2...');
    await pool.query(sql);
    console.log('Migration 086 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
