// Run once: node run-migration-091.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '091_ptm_mill_5.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration 091 — PTM Mill No. 5...');
    await pool.query(sql);
    const { rows } = await pool.query('SELECT name, display_order, is_active FROM ptm_mills ORDER BY display_order, id');
    console.log('Mills now:', rows.map((r) => `${r.name}${r.is_active ? '' : ' (inactive)'}`).join(', '));
    console.log('Migration 091 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
