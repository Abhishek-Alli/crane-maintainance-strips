// Run once: node run-migration-058.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '058_module_user_permissions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 058 — HSM/PTM/SMS user permissions tables...');
    await pool.query(sql);
    console.log('Migration 058 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
