const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  connectionString: 'postgresql://postgres.cqsprbnztayrxnfslaoa:3auuOBEgPxt4bk9j@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

// You need to set this - get from Vercel or .env
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8443813718:AAG1Ll0wWN4yDRc-ifk3vRSOaH2qRYxwfQY';

function sendToChat(chatId, message) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            console.log(`✅ Sent to ${chatId}`);
            resolve(true);
          } else {
            console.log(`❌ Failed for ${chatId}: ${parsed.description}`);
            resolve(false);
          }
        } catch (e) {
          console.log(`❌ Parse error for ${chatId}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Error for ${chatId}: ${err.message}`);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('=== TESTING TELEGRAM TO ALL RECIPIENTS ===\n');

  // Get all active recipients
  const { rows } = await pool.query('SELECT chat_id, label FROM telegram_recipients WHERE is_active = true');

  if (rows.length === 0) {
    console.log('No active recipients found!');
    await pool.end();
    return;
  }

  console.log(`Found ${rows.length} active recipients\n`);

  const message = `🔔 <b>Test Message</b>\n\nThis is a test from Crane Maintenance System.\nTimestamp: ${new Date().toISOString()}`;

  for (const recipient of rows) {
    console.log(`Sending to ${recipient.label} (${recipient.chat_id})...`);
    await sendToChat(recipient.chat_id, message);
  }

  console.log('\nDone!');
  await pool.end();
}

main().catch(console.error);
