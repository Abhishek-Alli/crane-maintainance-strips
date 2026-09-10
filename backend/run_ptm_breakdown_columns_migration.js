const { query } = require('./config/database');
require('dotenv').config();

async function run() {
  await query(`ALTER TABLE ptm_breakdown_slots ADD COLUMN IF NOT EXISTS pipe_pieces INTEGER`);
  console.log('✓ ptm_breakdown_slots.pipe_pieces');

  await query(`ALTER TABLE ptm_breakdown_slots ADD COLUMN IF NOT EXISTS pipe_length_m NUMERIC(6,2) DEFAULT 6`);
  console.log('✓ ptm_breakdown_slots.pipe_length_m');

  await query(`ALTER TABLE ptm_breakdown_entries ADD COLUMN IF NOT EXISTS repeated_count INTEGER`);
  console.log('✓ ptm_breakdown_entries.repeated_count');

  console.log('\nPTM breakdown columns migration done.');
  process.exit(0);
}

run().catch(e => { console.error('Failed:', e.message); process.exit(1); });
