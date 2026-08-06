const { query } = require('./config/database');
require('dotenv').config();

const sql = `
CREATE TABLE IF NOT EXISTS ptm_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('dc-motor','mechanical','parameter')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ptm_template_items (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES ptm_templates(id) ON DELETE CASCADE,
  section_name VARCHAR(100) DEFAULT 'General',
  item_name VARCHAR(200) NOT NULL,
  item_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS ptm_logs (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES ptm_templates(id),
  log_date DATE NOT NULL,
  shift VARCHAR(20),
  remark TEXT,
  filled_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, log_date)
);

CREATE TABLE IF NOT EXISTS ptm_log_entries (
  id SERIAL PRIMARY KEY,
  log_id INTEGER REFERENCES ptm_logs(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES ptm_template_items(id),
  status VARCHAR(20) CHECK (status IN ('OK','NOT_OK')),
  value_text VARCHAR(200),
  remark TEXT,
  action_taken TEXT
);

CREATE TABLE IF NOT EXISTS ptm_breakdown_logs (
  id SERIAL PRIMARY KEY,
  log_date DATE NOT NULL UNIQUE,
  size VARCHAR(50),
  filled_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ptm_breakdown_slots (
  id SERIAL PRIMARY KEY,
  log_id INTEGER REFERENCES ptm_breakdown_logs(id) ON DELETE CASCADE,
  slot_label VARCHAR(20),
  slot_order INTEGER,
  miss_roll INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ptm_breakdown_entries (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER REFERENCES ptm_breakdown_slots(id) ON DELETE CASCADE,
  breakdown_type VARCHAR(100),
  breakdown_minutes INTEGER,
  breakdown_reason TEXT
);
`;

async function run() {
  try {
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await query(stmt);
      const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match) console.log(`✓ ${match[1]}`);
    }
    console.log('\nPTM migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

run();
