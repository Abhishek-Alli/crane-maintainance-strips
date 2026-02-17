const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.cqsprbnztayrxnfslaoa:3auuOBEgPxt4bk9j@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inspections' ORDER BY ordinal_position"
  );
  console.log('=== INSPECTIONS TABLE COLUMNS ===');
  res.rows.forEach(c => console.log('  ', c.column_name, '-', c.data_type));
  await pool.end();
}
main().catch(e => { console.error(e); pool.end(); });
