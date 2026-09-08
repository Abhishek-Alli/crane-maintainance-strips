// Run once: node run-migration-049-053.js
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

const FILES = [
  '049_hsm_breakdown_analysis_images.sql',
  '050_hsm_delay_report_images.sql',
  '051_hsm_fm_daily_images.sql',
  '052_hsm_induction_daily_images.sql',
  '053_hsm_dc_daily_images.sql',
];

async function run() {
  try {
    for (const file of FILES) {
      const sqlPath = path.join(__dirname, 'migrations', file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log(`Running ${file}...`);
      await pool.query(sql);
    }
    console.log('Migrations 049-053 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
