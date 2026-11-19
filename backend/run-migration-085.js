// Run once: node run-migration-085.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '085_sms_caster_motor.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 085 — SMS Caster Motor...');
    await pool.query(sql);
    console.log('Migration 085 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
