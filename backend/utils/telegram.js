// Telegram Bot Utility – Crane Maintenance System
// Sends messages via Telegram Bot API to one or more chat IDs

const https = require('https');
const { query } = require('../config/database');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Send a message to a single Telegram chat ID
 */
function sendToChat(chatId, message) {
  return new Promise((resolve, reject) => {
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
            resolve(parsed);
          } else {
            console.error(`Telegram API error for chat ${chatId}:`, parsed.description);
            resolve(null); // resolve null instead of reject so other sends continue
          }
        } catch (e) {
          console.error('Failed to parse Telegram response:', e);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`Telegram send error for chat ${chatId}:`, err.message);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Get all active chat IDs from database + default from .env
 */
async function getAllChatIds() {
  const chatIds = new Set();

  // Always include the default chat ID from .env
  if (DEFAULT_CHAT_ID) {
    chatIds.add(DEFAULT_CHAT_ID);
  }

  try {
    const { rows } = await query(
      'SELECT chat_id FROM telegram_recipients WHERE is_active = true'
    );
    rows.forEach((r) => chatIds.add(r.chat_id));
  } catch (err) {
    // Table may not exist yet – use default only
    console.error('telegram_recipients query failed (table may not exist):', err.message);
  }

  return [...chatIds];
}

/**
 * Send a Telegram message to ALL registered recipients
 */
async function sendTelegramMessage(message) {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set – skipping message');
    return [];
  }

  const chatIds = await getAllChatIds();

  if (chatIds.length === 0) {
    console.warn('No Telegram chat IDs configured – message not sent');
    return [];
  }

  const results = await Promise.all(
    chatIds.map((id) => sendToChat(id, message))
  );

  const sent = results.filter(Boolean).length;
  console.log(`Telegram: sent to ${sent}/${chatIds.length} recipients`);
  return results;
}

/**
 * Send a test message to verify connectivity
 */
async function sendTestMessage(chatId) {
  const msg = '✅ Crane Maintenance System\nTelegram integration is working!';
  return sendToChat(chatId || DEFAULT_CHAT_ID, msg);
}

module.exports = {
  sendTelegramMessage,
  sendTestMessage,
  sendToChat
};
