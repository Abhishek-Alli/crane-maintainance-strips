const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.cqsprbnztayrxnfslaoa:3auuOBEgPxt4bk9j@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  // Check current recipients
  const recipients = await pool.query('SELECT * FROM telegram_recipients ORDER BY id');
  console.log('=== TELEGRAM RECIPIENTS ===\n');
  console.log('Total recipients:', recipients.rows.length);

  if (recipients.rows.length > 0) {
    console.log('\nRecipients:');
    recipients.rows.forEach(r => {
      const status = r.is_active ? '✅ Active' : '❌ Inactive';
      console.log(`  ID: ${r.id} | Chat: ${r.chat_id} | Label: ${r.label} | ${status}`);
    });
  } else {
    console.log('\nNo recipients configured!');
  }

  await pool.end();
}

main().catch(console.error);
