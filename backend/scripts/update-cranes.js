const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.cqsprbnztayrxnfslaoa:3auuOBEgPxt4bk9j@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  // Show current HSM Shed A cranes
  const cranes = await pool.query(`
    SELECT c.id, c.crane_number, s.name as shed, d.name as dept
    FROM cranes c
    JOIN sheds s ON s.id = c.shed_id
    JOIN departments d ON d.id = s.department_id
    WHERE d.name = 'HSM' AND s.name = 'Shed A'
    ORDER BY c.id
  `);

  console.log('Current HSM > Shed A cranes:');
  cranes.rows.forEach(c => console.log('  ID:', c.id, '|', c.crane_number));

  // Update crane ID 30 to 20 TON-1 STD
  console.log('\nUpdating ID 30...');
  const result = await pool.query(
    'UPDATE cranes SET crane_number = $1 WHERE id = $2 RETURNING id, crane_number',
    ['20 TON-1 STD', 30]
  );
  if (result.rows.length > 0) {
    console.log('  ✅ Updated ID 30:', result.rows[0].crane_number);
  }

  // Verify
  console.log('\nAfter update:');
  const updated = await pool.query(`
    SELECT c.id, c.crane_number
    FROM cranes c
    JOIN sheds s ON s.id = c.shed_id
    JOIN departments d ON d.id = s.department_id
    WHERE d.name = 'HSM' AND s.name = 'Shed A'
    ORDER BY c.id
  `);
  updated.rows.forEach(c => console.log('  ID:', c.id, '|', c.crane_number));

  await pool.end();
}

main().catch(console.error);
