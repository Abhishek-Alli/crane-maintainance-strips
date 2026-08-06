require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_permission_lists (
        id SERIAL PRIMARY KEY,
        module_code VARCHAR(100) NOT NULL,
        item_key VARCHAR(100) NOT NULL,
        item_label VARCHAR(200) NOT NULL,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(module_code, item_key)
      );
    `);

    // Seed HBM sheets
    const hbmSheets = [
      ['dc-motor',        'DC Motor',                          1],
      ['rolling-stand',   'Rolling Stand',                     2],
      ['mill-mech',       'Mill Mechanical',                   3],
      ['cooling-bed',     'Cooling Bed',                       4],
      ['pumphouse',       'Pumphouse',                         5],
      ['bar-bundle',      'Bar Bundle Area',                   6],
      ['before-rolling',  'Before Rolling',                    7],
      ['pump-param',      'Pump Parameter Report',             8],
      ['water-param',     'Water Parameters',                  9],
      ['ph-maint',        'PH Maintenance',                   10],
      ['transformer',     'HBM Transformer',                  11],
      ['oil-level',       'Daily Oil Level',                  12],
      ['dc-motor-airflow','DC Motor Airflow Report',          13],
      ['roughing-gb-temp','Roughing Stand & GB Bearing Temp', 14],
      ['breakdown',       'HBM Breakdown Report',             15],
    ];

    for (const [key, label, order] of hbmSheets) {
      await client.query(`
        INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
        VALUES ('HBM_CHECKSHEETS', $1, $2, $3)
        ON CONFLICT (module_code, item_key) DO NOTHING
      `, [key, label, order]);
    }

    // Seed Crane sections
    const craneSections = [
      ['dashboard',   'Dashboard',            1],
      ['inspection',  'New Inspection',       2],
      ['calendar',    'Maintenance Calendar', 3],
      ['reports',     'Reports',              4],
      ['fabrication', 'Fabrication',          5],
    ];

    for (const [key, label, order] of craneSections) {
      await client.query(`
        INSERT INTO app_permission_lists (module_code, item_key, item_label, display_order)
        VALUES ('CRANE_MAINTENANCE', $1, $2, $3)
        ON CONFLICT (module_code, item_key) DO NOTHING
      `, [key, label, order]);
    }

    console.log('Migration complete: app_permission_lists table created and seeded.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
