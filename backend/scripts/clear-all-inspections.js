const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.cqsprbnztayrxnfslaoa:3auuOBEgPxt4bk9j@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== CLEARING ALL INSPECTION DATA FOR PRODUCTION ===\n');

  // 1. Delete inspection_values (OK/NOT_OK/remarks)
  const values = await pool.query('DELETE FROM inspection_values RETURNING id');
  console.log('Deleted inspection_values:', values.rowCount);

  // 2. Delete inspections
  const inspections = await pool.query('DELETE FROM inspections RETURNING id');
  console.log('Deleted inspections:', inspections.rowCount);

  // 3. Clear submission_log if exists
  try {
    const log = await pool.query('DELETE FROM submission_log RETURNING id');
    console.log('Deleted submission_log:', log.rowCount);
  } catch (e) {
    console.log('submission_log: skipped (empty or not found)');
  }

  // 4. Reset monthly_maintenance_tracking
  try {
    const tracking = await pool.query('DELETE FROM monthly_maintenance_tracking RETURNING id');
    console.log('Deleted monthly_maintenance_tracking:', tracking.rowCount);
  } catch (e) {
    console.log('monthly_maintenance_tracking: skipped');
  }

  // 5. Verify everything is clean
  console.log('\n=== VERIFICATION ===');
  const tables = ['inspections', 'inspection_values', 'submission_log', 'monthly_maintenance_tracking'];
  for (const table of tables) {
    try {
      const count = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ${table}: ${count.rows[0].count} rows`);
    } catch (e) {
      console.log(`  ${table}: table not found`);
    }
  }

  console.log('\nProduction ready!');
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });
