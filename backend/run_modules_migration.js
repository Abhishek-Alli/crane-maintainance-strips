const { query } = require('./config/database');
require('dotenv').config();

async function run() {
  await query(`
    CREATE TABLE IF NOT EXISTS app_modules (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(30) NOT NULL UNIQUE,
      color VARCHAR(30) DEFAULT 'blue',
      route_prefix VARCHAR(50) NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ app_modules table created');

  const { rows } = await query('SELECT COUNT(*) FROM app_modules');
  if (parseInt(rows[0].count) === 0) {
    await query(`
      INSERT INTO app_modules (name, code, color, route_prefix, display_order) VALUES
        ('Crane Maintenance', 'CRANE_MAINTENANCE', 'blue',    '/',           1),
        ('HBM Checksheets',  'HBM_CHECKSHEETS',  'emerald', '/hbm',        2),
        ('HSM Checksheets',  'HSM_CHECKSHEETS',  'indigo',  '/hsm',        3),
        ('PTM Checksheets',  'PTM_CHECKSHEETS',  'blue',    '/ptm',        4)
    `);
    console.log('✓ Seeded default modules');
  }

  console.log('Done.');
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
