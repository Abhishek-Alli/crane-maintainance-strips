const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.cqsprbnztayrxnfslaoa:3auuOBEgPxt4bk9j@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

// Get date from command line argument
const dateArg = process.argv[2];

async function main() {
  if (!dateArg) {
    console.log('Usage: node delete-inspections-by-date.js <date>');
    console.log('Date format: YYYY-MM-DD (e.g., 2026-02-05)');
    console.log('\nAvailable dates with inspections:');

    const dates = await pool.query(`
      SELECT
        DATE(inspection_date) as date,
        COUNT(*) as count
      FROM inspections
      GROUP BY DATE(inspection_date)
      ORDER BY date DESC
    `);

    dates.rows.forEach(r => {
      const dateStr = new Date(r.date).toISOString().split('T')[0];
      console.log(`  ${dateStr}: ${r.count} inspections`);
    });

    await pool.end();
    return;
  }

  // Parse and validate date
  const targetDate = new Date(dateArg);
  if (isNaN(targetDate.getTime())) {
    console.error('Invalid date format. Use YYYY-MM-DD');
    await pool.end();
    return;
  }

  const dateStr = targetDate.toISOString().split('T')[0];
  console.log(`\nDeleting inspections for date: ${dateStr}\n`);

  // First, show what will be deleted
  const toDelete = await pool.query(`
    SELECT
      i.id,
      d.name as department,
      s.name as shed,
      c.crane_number,
      (SELECT COUNT(*) FROM inspection_values WHERE inspection_id = i.id) as items_count
    FROM inspections i
    JOIN departments d ON d.id = i.department_id
    JOIN sheds s ON s.id = i.shed_id
    JOIN cranes c ON c.id = i.crane_id
    WHERE DATE(i.inspection_date) = $1
  `, [dateStr]);

  if (toDelete.rows.length === 0) {
    console.log('No inspections found for this date.');
    await pool.end();
    return;
  }

  console.log('Inspections to be deleted:');
  toDelete.rows.forEach(r => {
    console.log(`  ID: ${r.id} | ${r.department} > ${r.shed} > ${r.crane_number} | ${r.items_count} items`);
  });

  // Delete inspection_values first (foreign key constraint)
  const valuesResult = await pool.query(`
    DELETE FROM inspection_values
    WHERE inspection_id IN (
      SELECT id FROM inspections WHERE DATE(inspection_date) = $1
    )
    RETURNING id
  `, [dateStr]);

  console.log(`\nDeleted ${valuesResult.rowCount} inspection values`);

  // Delete inspections
  const inspResult = await pool.query(`
    DELETE FROM inspections
    WHERE DATE(inspection_date) = $1
    RETURNING id
  `, [dateStr]);

  console.log(`Deleted ${inspResult.rowCount} inspections`);
  console.log('\n✅ Deletion complete!');

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  pool.end();
});
