/**
 * Data Migration Script: Local PostgreSQL to Supabase
 * Migrates actual data from local crane_maintainance database to Supabase
 */

const { Pool } = require('pg');

// Local PostgreSQL connection
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crane_maintainance',
  user: 'postgres',
  password: 'Abhi122103'
});

// Supabase connection (Session Pooler)
const supabasePool = new Pool({
  connectionString: 'postgresql://postgres.cqsprbnztayrxnfslaoa:3auuOBEgPxt4bk9j@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function updateSupabaseSchema() {
  console.log('\n📐 Updating Supabase schema to match local database...\n');

  const schemaUpdates = [
    // Add missing column to departments
    `ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT`,

    // Add missing columns to cranes
    `ALTER TABLE cranes ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id)`,
    `ALTER TABLE cranes ADD COLUMN IF NOT EXISTS capacity_ton INTEGER`,
    `ALTER TABLE cranes ADD COLUMN IF NOT EXISTS crane_type VARCHAR(100)`,
    `ALTER TABLE cranes ADD COLUMN IF NOT EXISTS last_inspection_date DATE`,
    `ALTER TABLE cranes ADD COLUMN IF NOT EXISTS next_maintenance_date DATE`,
    `ALTER TABLE cranes ADD COLUMN IF NOT EXISTS current_status VARCHAR(50)`,
    `ALTER TABLE cranes ADD COLUMN IF NOT EXISTS current_maintenance_status VARCHAR(50)`,

    // Add missing column to forms
    `ALTER TABLE forms ADD COLUMN IF NOT EXISTS code VARCHAR(50)`,

    // Create form_sections if not exists
    `CREATE TABLE IF NOT EXISTS form_sections (
      id SERIAL PRIMARY KEY,
      form_id INTEGER REFERENCES forms(id),
      name VARCHAR(255) NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_required BOOLEAN DEFAULT false,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create form_items if not exists
    `CREATE TABLE IF NOT EXISTS form_items (
      id SERIAL PRIMARY KEY,
      section_id INTEGER REFERENCES form_sections(id),
      field_name VARCHAR(255) NOT NULL,
      field_type VARCHAR(50) DEFAULT 'TEXT',
      display_order INTEGER DEFAULT 0,
      is_required BOOLEAN DEFAULT false,
      dropdown_options TEXT[],
      default_value TEXT,
      help_text TEXT,
      alert_value TEXT,
      alert_message TEXT,
      conditional_logic JSONB,
      alert_condition VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create inspection_sections if not exists
    `CREATE TABLE IF NOT EXISTS inspection_sections (
      id SERIAL PRIMARY KEY,
      form_id INTEGER REFERENCES forms(id),
      name VARCHAR(255) NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_compulsory BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Recreate inspection_items with proper structure
    `DROP TABLE IF EXISTS inspection_items CASCADE`,
    `CREATE TABLE inspection_items (
      id SERIAL PRIMARY KEY,
      section_id INTEGER REFERENCES inspection_sections(id),
      item_name VARCHAR(255) NOT NULL,
      display_order INTEGER DEFAULT 0,
      dropdown_values TEXT[],
      compulsory VARCHAR(20) DEFAULT 'no',
      alert_condition VARCHAR(50),
      alert_value VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Update inspections table
    `ALTER TABLE inspections ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP`,
    `ALTER TABLE inspections ADD COLUMN IF NOT EXISTS pdf_url TEXT`,

    // Create inspection_values if not exists
    `CREATE TABLE IF NOT EXISTS inspection_values (
      id SERIAL PRIMARY KEY,
      inspection_id INTEGER REFERENCES inspections(id) ON DELETE CASCADE,
      item_id INTEGER REFERENCES inspection_items(id),
      selected_value VARCHAR(255),
      remarks TEXT,
      is_alert BOOLEAN DEFAULT false,
      alert_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create maintenance_schedule if not exists
    `CREATE TABLE IF NOT EXISTS maintenance_schedule (
      id SERIAL PRIMARY KEY,
      crane_id INTEGER REFERENCES cranes(id),
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      inspection_id INTEGER,
      completed_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(crane_id, year, month)
    )`,
  ];

  for (const sql of schemaUpdates) {
    try {
      await supabasePool.query(sql);
      console.log('   ✅ Schema update successful');
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
        console.log(`   ⚠️  ${error.message}`);
      }
    }
  }
}

async function migrateTableSimple(tableName, columns) {
  console.log(`\n📦 Migrating table: ${tableName}`);

  try {
    // Get data from local database
    const localResult = await localPool.query(`SELECT * FROM ${tableName} ORDER BY id`);
    const rows = localResult.rows;

    if (rows.length === 0) {
      console.log(`   ⚠️  No data in ${tableName}`);
      return 0;
    }

    console.log(`   Found ${rows.length} rows`);

    // Clear existing data in Supabase
    await supabasePool.query(`DELETE FROM ${tableName}`);

    // Insert each row
    let inserted = 0;
    for (const row of rows) {
      // Only use columns that exist in both
      const availableCols = columns.filter(c => row[c] !== undefined);
      const values = availableCols.map(c => row[c]);
      const placeholders = availableCols.map((_, i) => `$${i + 1}`).join(', ');

      const insertQuery = `INSERT INTO ${tableName} (${availableCols.join(', ')}) VALUES (${placeholders})`;

      try {
        await supabasePool.query(insertQuery, values);
        inserted++;
      } catch (err) {
        console.log(`   ⚠️  Row ${row.id}: ${err.message}`);
      }
    }

    // Reset sequence
    try {
      const maxIdResult = await supabasePool.query(`SELECT MAX(id) as max_id FROM ${tableName}`);
      const maxId = maxIdResult.rows[0].max_id || 0;
      if (maxId > 0) {
        await supabasePool.query(`SELECT setval('${tableName}_id_seq', $1, true)`, [maxId]);
      }
    } catch (e) {
      // Sequence might not exist
    }

    console.log(`   ✅ Migrated ${inserted}/${rows.length} rows`);
    return inserted;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting data migration from Local PostgreSQL to Supabase');
  console.log('================================================================');

  try {
    // Test connections
    console.log('\nTesting connections...');
    await localPool.query('SELECT 1');
    console.log('✅ Local PostgreSQL connected');

    await supabasePool.query('SELECT 1');
    console.log('✅ Supabase connected');

    // Update schema first
    await updateSupabaseSchema();

    // Migration order (respecting foreign keys)
    console.log('\n================================================================');
    console.log('📊 MIGRATING DATA');
    console.log('================================================================');

    const migrations = [
      { table: 'departments', columns: ['id', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at'] },
      { table: 'sheds', columns: ['id', 'department_id', 'name', 'code', 'is_active', 'created_at', 'updated_at'] },
      { table: 'cranes', columns: ['id', 'department_id', 'shed_id', 'crane_number', 'maintenance_frequency', 'capacity_ton', 'crane_type', 'last_inspection_date', 'next_maintenance_date', 'current_status', 'current_maintenance_status', 'is_active', 'created_at', 'updated_at'] },
      { table: 'forms', columns: ['id', 'name', 'code', 'description', 'version', 'created_by', 'is_active', 'created_at', 'updated_at'] },
      { table: 'form_sections', columns: ['id', 'form_id', 'name', 'display_order', 'is_required', 'description', 'created_at'] },
      { table: 'form_items', columns: ['id', 'section_id', 'field_name', 'field_type', 'display_order', 'is_required', 'dropdown_options', 'default_value', 'help_text', 'alert_value', 'alert_message', 'conditional_logic', 'alert_condition', 'created_at'] },
      { table: 'inspection_sections', columns: ['id', 'form_id', 'name', 'display_order', 'is_compulsory', 'is_active', 'created_at', 'updated_at'] },
      { table: 'inspection_items', columns: ['id', 'section_id', 'item_name', 'display_order', 'dropdown_values', 'compulsory', 'alert_condition', 'alert_value', 'is_active', 'created_at', 'updated_at'] },
      { table: 'telegram_recipients', columns: ['id', 'chat_id', 'name', 'is_active', 'created_at', 'updated_at'] },
    ];

    let totalMigrated = 0;
    for (const m of migrations) {
      const count = await migrateTableSimple(m.table, m.columns);
      totalMigrated += count;
    }

    // Final verification
    console.log('\n================================================================');
    console.log('📊 VERIFICATION');
    console.log('================================================================');

    for (const m of migrations) {
      try {
        const result = await supabasePool.query(`SELECT COUNT(*) as count FROM ${m.table}`);
        console.log(`   ${m.table}: ${result.rows[0].count} rows`);
      } catch (e) {
        console.log(`   ${m.table}: error - ${e.message}`);
      }
    }

    console.log('\n================================================================');
    console.log(`✅ Migration complete! Total rows: ${totalMigrated}`);
    console.log('================================================================');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    await localPool.end();
    await supabasePool.end();
  }
}

main();
