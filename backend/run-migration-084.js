// Run once: node run-migration-084.js  (CCM Pump House area rename + EOT Crane Electrical)
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');
require('dotenv').config();

const FILES = ['082_sms_ccm_pump_house_area_rename.sql', '083_sms_eot_crane_electrical.sql'];

async function run() {
  try {
    for (const f of FILES) {
      const sql = fs.readFileSync(path.join(__dirname, 'migrations', f), 'utf8');
      console.log(`Running ${f}...`);
      await pool.query(sql);
    }
    console.log('Migrations 082 + 083 completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
