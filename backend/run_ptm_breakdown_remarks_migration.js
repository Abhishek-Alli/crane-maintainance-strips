const { query } = require('./config/database');
require('dotenv').config();

async function run() {
  await query(`ALTER TABLE ptm_breakdown_entries ADD COLUMN IF NOT EXISTS remarks TEXT`);
  console.log('✓ ptm_breakdown_entries.remarks');
  console.log('\nPTM breakdown remarks column migration done.');
  process.exit(0);
}

run().catch(e => { console.error('Failed:', e.message); process.exit(1); });
