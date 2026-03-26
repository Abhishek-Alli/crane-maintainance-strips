// Telegram Bot Utility – Crane Maintenance System
// Sends messages via Telegram Bot API to one or more chat IDs

const https = require('https');
const { query } = require('../config/database');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Maps human-readable checksheet type labels → DB key stored in checksheet_types[]
const TYPE_LABEL_TO_KEY = {
  'DC Motor':        'dc-motor',
  'Rolling Stand':   'rolling-stand',
  'Mill Mechanical': 'mill-mech',
  'Cooling Bed':     'cooling-bed',
  'Pumphouse':       'pumphouse',
  'Bar Bundle Area': 'bar-bundle',
  'Before Rolling':  'before-rolling',
};

/**
 * Send a message to a single Telegram chat ID
 */
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
            resolve(parsed);
          } else {
            console.error(`Telegram API error for chat ${chatId}:`, parsed.description);
            resolve(null);
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
 * Internal: send a message to an explicit list of chat IDs
 */
async function sendToIds(chatIds, message) {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set – skipping message');
    return [];
  }
  if (chatIds.length === 0) {
    console.warn('No Telegram chat IDs to send to – message skipped');
    return [];
  }
  const results = await Promise.all(chatIds.map((id) => sendToChat(id, message)));
  const sent = results.filter(Boolean).length;
  console.log(`Telegram: sent to ${sent}/${chatIds.length} recipients`);
  return results;
}

/**
 * Get ALL active chat IDs (no type filter) — used for broadcasts
 */
async function getAllChatIds() {
  const chatIds = new Set();
  if (DEFAULT_CHAT_ID) chatIds.add(DEFAULT_CHAT_ID);

  try {
    const { rows } = await query(
      'SELECT chat_id FROM telegram_recipients WHERE is_active = true'
    );
    rows.forEach((r) => chatIds.add(r.chat_id));
  } catch (err) {
    console.error('telegram_recipients query failed (table may not exist):', err.message);
  }

  return [...chatIds];
}

/**
 * Get chat IDs filtered by checksheet type key.
 * Recipients with checksheet_types = NULL receive all types.
 * Recipients with a non-empty array receive only the listed types.
 * DEFAULT_CHAT_ID from .env always receives everything.
 */
async function getChatIdsForType(typeKey) {
  const chatIds = new Set();
  if (DEFAULT_CHAT_ID) chatIds.add(DEFAULT_CHAT_ID);

  try {
    const { rows } = await query(
      `SELECT chat_id FROM telegram_recipients
       WHERE is_active = true
         AND (checksheet_types IS NULL OR $1 = ANY(checksheet_types))`,
      [typeKey]
    );
    rows.forEach((r) => chatIds.add(r.chat_id));
  } catch (err) {
    // If column doesn't exist yet (migration not run), fall back to all active
    console.error('getChatIdsForType query failed, falling back to all:', err.message);
    try {
      const { rows } = await query(
        'SELECT chat_id FROM telegram_recipients WHERE is_active = true'
      );
      rows.forEach((r) => chatIds.add(r.chat_id));
    } catch (e) {
      console.error('Fallback query also failed:', e.message);
    }
  }

  return [...chatIds];
}

/**
 * Send a Telegram message to ALL registered recipients (broadcast)
 */
async function sendTelegramMessage(message) {
  const chatIds = await getAllChatIds();
  return sendToIds(chatIds, message);
}

/**
 * Send a test message to verify connectivity
 */
async function sendTestMessage(chatId) {
  const msg = '✅ Crane Maintenance System\nTelegram integration is working!';
  return sendToChat(chatId || DEFAULT_CHAT_ID, msg);
}

/**
 * Send long text in chunks of ≤4000 chars to a specific set of chat IDs
 */
async function sendLongMessageToIds(chatIds, text) {
  const MAX = 4000;
  if (text.length <= MAX) return sendToIds(chatIds, text);

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
    await sendToIds(chatIds, chunk);
  }
}

/**
 * Send long text as multiple Telegram messages (broadcast version)
 */
async function sendLongMessage(text) {
  const chatIds = await getAllChatIds();
  return sendLongMessageToIds(chatIds, text);
}

/**
 * Build and send a Telegram notification when an HBM checksheet is submitted.
 * Only sends to recipients subscribed to that checksheet type.
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

  // Resolve type key for filtering
  const typeKey = TYPE_LABEL_TO_KEY[checksheetType] || checksheetType.toLowerCase().replace(/\s+/g, '-');

  // Get only the recipients subscribed to this checksheet type
  const chatIds = await getChatIdsForType(typeKey);
  if (chatIds.length === 0) {
    console.log(`Telegram: no recipients subscribed to "${checksheetType}" – skipping`);
    return [];
  }

  const okItems    = items.filter((i) => i.status !== 'NOT_OK');
  const notOkItems = items.filter((i) => i.status === 'NOT_OK');
  const totalItems = items.length;

  const submittedStr = submittedAt
    ? submittedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
    : 'N/A';

  const shiftLabel = shift ? ` | Shift: <b>${shift}</b>` : '';
  const timeLabel  = time  ? ` | Time: <b>${time}</b>`  : '';

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

  return sendLongMessageToIds(chatIds, message);
}

module.exports = {
  sendTelegramMessage,
  sendTestMessage,
  sendToChat,
  sendHbmChecksheetNotification,
};
