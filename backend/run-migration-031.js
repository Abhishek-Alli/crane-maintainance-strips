// Run this once: node run-migration-031.js
const { pool } = require('./config/database');
require('dotenv').config();

const sql = `
ALTER TABLE hbm_water_param_entries
  ALTER COLUMN ph TYPE VARCHAR(20) USING ph::TEXT;
`;

async function run() {
  try {
    console.log('Running migration 031 — Water Param PH column to VARCHAR...');
    await pool.query(sql);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

run();
