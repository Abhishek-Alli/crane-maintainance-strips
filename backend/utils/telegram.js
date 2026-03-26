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

/**
 * Send long text as multiple Telegram messages if it exceeds Telegram's 4096-char limit.
 */
async function sendLongMessage(text) {
  const MAX = 4000; // leave buffer below 4096
  if (text.length <= MAX) return sendTelegramMessage(text);

  // Split on newlines to avoid cutting mid-word / mid-tag
  const lines = text.split('\n');
  const chunks = [];
  let current = '';

  for (const line of lines) {
    if ((current + '\n' + line).length > MAX) {
      if (current) chunks.push(current.trim());
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  for (const chunk of chunks) {
    await sendTelegramMessage(chunk);
  }
}

/**
 * Build and send a Telegram notification when an HBM checksheet is submitted.
 *
 * @param {object} opts
 * @param {string}  opts.checksheetType  - e.g. 'DC Motor', 'Cooling Bed', …
 * @param {string}  opts.date            - log_date (YYYY-MM-DD)
 * @param {string}  [opts.time]          - log_time (HH:MM)
 * @param {string}  [opts.shift]         - DAY / NIGHT / GENERAL
 * @param {string}  opts.filledBy        - username of the person who submitted
 * @param {Date}    opts.submittedAt     - JS Date of submission (usually new Date())
 * @param {string}  [opts.remarks]       - overall log-level remarks
 * @param {Array}   opts.items           - full items array from the request body
 */
async function sendHbmChecksheetNotification(opts) {
  const { checksheetType, date, time, shift, filledBy, submittedAt, remarks, items = [] } = opts;

  const okItems    = items.filter((i) => i.status !== 'NOT_OK');
  const notOkItems = items.filter((i) => i.status === 'NOT_OK');
  const totalItems = items.length;

  // Format submitted-at timestamp (IST)
  const submittedStr = submittedAt
    ? submittedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
    : 'N/A';

  const shiftLabel = shift ? ` | Shift: <b>${shift}</b>` : '';
  const timeLabel  = time  ? ` | Time: <b>${time}</b>`  : '';

  // ── Header ──
  let message =
    `🔔 <b>HBM Checksheet Submitted</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📋 <b>${checksheetType} Checksheet</b>\n` +
    `📅 Date: <b>${date}</b>${timeLabel}${shiftLabel}\n` +
    `👤 Filled By: <b>${filledBy}</b>\n` +
    `🕐 Submitted At: <b>${submittedStr}</b>\n` +
    `📊 Total: <b>${totalItems}</b>  ✅ OK: <b>${okItems.length}</b>  ❌ NOT OK: <b>${notOkItems.length}</b>\n`;

  if (remarks && remarks.trim()) {
    message += `📝 Overall Remarks: <i>${remarks.trim()}</i>\n`;
  }

  // ── Group all items by section › block ──
  const grouped = {};
  for (const item of items) {
    const sectionKey = [item.section_name, item.block_name].filter(Boolean).join(' › ') || 'General';
    if (!grouped[sectionKey]) grouped[sectionKey] = [];
    grouped[sectionKey].push(item);
  }

  message += `\n━━━━━━━━━━━━━━━━━━━\n<b>INSPECTION DETAILS</b>\n`;

  for (const [sectionKey, sectionItems] of Object.entries(grouped)) {
    message += `\n📂 <b>${sectionKey}</b>\n`;
    for (const item of sectionItems) {
      const statusIcon = item.status === 'NOT_OK' ? '❌' : '✅';
      message += `  ${statusIcon} ${item.item_name}\n`;
      if (item.remark && item.remark.trim()) {
        message += `      📝 Remark: ${item.remark.trim()}\n`;
      }
      if (item.action_taken && item.action_taken.trim()) {
        message += `      🔧 Action: ${item.action_taken.trim()}\n`;
      }
    }
  }

  if (notOkItems.length === 0) {
    message += `\n✅ <b>All items OK — No issues found.</b>\n`;
  }

  return sendLongMessage(message);
}

module.exports = {
  sendTelegramMessage,
  sendTestMessage,
  sendToChat,
  sendHbmChecksheetNotification
};
