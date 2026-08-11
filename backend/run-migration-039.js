// Run once: node run-migration-039.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '039_hsm_roll_change_images.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 039 — HSM Roll Change images...');
    await pool.query(sql);
    console.log('Migration 039 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
