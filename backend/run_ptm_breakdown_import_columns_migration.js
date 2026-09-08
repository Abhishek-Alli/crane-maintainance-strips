const { query } = require('./config/database');
require('dotenv').config();

async function run() {
  await query(`ALTER TABLE ptm_breakdown_entries ADD COLUMN IF NOT EXISTS shift VARCHAR(20)`);
  console.log('✓ ptm_breakdown_entries.shift');

  await query(`ALTER TABLE ptm_breakdown_entries ADD COLUMN IF NOT EXISTS size VARCHAR(20)`);
  console.log('✓ ptm_breakdown_entries.size');

  await query(`ALTER TABLE ptm_breakdown_entries ADD COLUMN IF NOT EXISTS thickness VARCHAR(20)`);
  console.log('✓ ptm_breakdown_entries.thickness');

  await query(`ALTER TABLE ptm_breakdown_entries ADD COLUMN IF NOT EXISTS pipe_pieces INTEGER`);
  console.log('✓ ptm_breakdown_entries.pipe_pieces');

  await query(`ALTER TABLE ptm_breakdown_entries ADD COLUMN IF NOT EXISTS pipe_length_m NUMERIC(6,2)`);
  console.log('✓ ptm_breakdown_entries.pipe_length_m');

  console.log('\nPTM breakdown import columns migration done.');
  process.exit(0);
}

run().catch(e => { console.error('Failed:', e.message); process.exit(1); });
