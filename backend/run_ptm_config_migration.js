const { query } = require('./config/database');
require('dotenv').config();

async function run() {
  await query(`
    CREATE TABLE IF NOT EXISTS ptm_mills (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true
    )
  `);
  console.log('✓ ptm_mills');

  await query(`
    CREATE TABLE IF NOT EXISTS ptm_breakdown_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      has_size_change BOOLEAN DEFAULT false,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true
    )
  `);
  console.log('✓ ptm_breakdown_types');

  await query(`
    CREATE TABLE IF NOT EXISTS ptm_sizes (
      id SERIAL PRIMARY KEY,
      size_label VARCHAR(20) NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true
    )
  `);
  console.log('✓ ptm_sizes');

  // Seed mills
  const millRows = await query('SELECT COUNT(*) FROM ptm_mills');
  if (parseInt(millRows.rows[0].count) === 0) {
    await query(`INSERT INTO ptm_mills (name, display_order) VALUES ('Mill No. 1',1),('Mill No. 2',2),('Mill No. 3',3),('Mill No. 4',4)`);
    console.log('✓ Seeded mills');
  }

  // Seed breakdown types
  const typeRows = await query('SELECT COUNT(*) FROM ptm_breakdown_types');
  if (parseInt(typeRows.rows[0].count) === 0) {
    await query(`INSERT INTO ptm_breakdown_types (name, has_size_change, display_order) VALUES ('Electrical',false,1),('Mechanical',false,2),('Production',false,3),('Roll Change',true,4)`);
    console.log('✓ Seeded breakdown types');
  }

  // Seed sizes
  const sizeRows = await query('SELECT COUNT(*) FROM ptm_sizes');
  if (parseInt(sizeRows.rows[0].count) === 0) {
    await query(`INSERT INTO ptm_sizes (size_label, display_order) VALUES ('8MM',1),('10MM',2),('12MM',3),('16MM',4),('20MM',5),('25MM',6),('28MM',7),('32MM',8),('36MM',9),('40MM',10)`);
    console.log('✓ Seeded sizes');
  }

  console.log('\nPTM config migration done.');
  process.exit(0);
}

run().catch(e => { console.error('Failed:', e.message); process.exit(1); });
