// Run once: node run-migration-087.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '087_sms_slab_strands.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 087 — SMS Slab Strands...');
    await pool.query(sql);
    console.log('Migration 087 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
