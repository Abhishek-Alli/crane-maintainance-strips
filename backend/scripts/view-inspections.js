const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.cqsprbnztayrxnfslaoa:3auuOBEgPxt4bk9j@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== ALL INSPECTIONS ===\n');

  const insp = await pool.query(`
    SELECT
      i.id,
      i.inspection_date,
      d.name as department,
      s.name as shed,
      c.crane_number,
      i.has_alerts,
      (SELECT COUNT(*) FROM inspection_values WHERE inspection_id = i.id) as items_count
    FROM inspections i
    JOIN departments d ON d.id = i.department_id
    JOIN sheds s ON s.id = i.shed_id
    JOIN cranes c ON c.id = i.crane_id
    ORDER BY i.inspection_date DESC
  `);

  console.log('Total inspections:', insp.rows.length);

  if (insp.rows.length > 0) {
    console.log('\nInspections:');
    insp.rows.forEach(r => {
      const date = new Date(r.inspection_date).toLocaleDateString('en-IN');
      console.log(`  ID: ${r.id} | Date: ${date} | ${r.department} > ${r.shed} > ${r.crane_number} | Items: ${r.items_count}`);
    });
  }

  // Count by date
  console.log('\n=== COUNT BY DATE ===');
  const byDate = await pool.query(`
    SELECT
      DATE(inspection_date) as date,
      COUNT(*) as count
    FROM inspections
    GROUP BY DATE(inspection_date)
    ORDER BY date DESC
  `);

  byDate.rows.forEach(r => {
    console.log(`  ${new Date(r.date).toLocaleDateString('en-IN')}: ${r.count} inspections`);
  });

  await pool.end();
}

main().catch(console.error);
