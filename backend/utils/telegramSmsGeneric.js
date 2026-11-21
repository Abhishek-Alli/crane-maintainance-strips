// Generic Telegram notifications for SMS, HSM and PTM checksheets (everything except the
// SMS motor-current sheets, which notify from their own controller).
//
// One Express middleware watches the SMS routes. After a successful POST (new entry) or
// PUT (edit) it loads the saved record through that sheet's existing getById controller,
// builds a readable message and sends it using the same recipient rules as
// telegramSmsNotify.js (admins get everything; others only subscribed sheets; alerts-only
// recipients only abnormal entries). An edit sends a fresh message marked "UPDATED".
//
// A Telegram problem can never affect saving: everything runs after the response is sent.

const { getSmsRecipientIds } = require('./telegramSmsNotify');
const { sendLongMessageToIds } = require('./telegram');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Columns that are internal or not useful in a message
const SKIP_KEYS = new Set([
  'id', 'images', 'image', 'photos', 'can_modify', 'filled_by', 'filled_by_name',
  'created_at', 'updated_at', 'deleted_at', 'stand_motor',
  'report_date', 'recorded_by', // already shown in the message header
]);

const BAD_VALUE = /^(NOT[ _-]?(OK|OKAY|NORMAL|WORKING|GOOD)|NOK|ABNORMAL|FAULTY|DEFECTIVE|DAMAGED|FAIL(ED)?|BAD)$/i;

const prettify = (key) =>
  String(key).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** A value counts as abnormal when it is a "Not OK" style answer, or "Yes" to an "abnormality" question */
function isBad(key, value) {
  if (typeof value === 'boolean') return false;
  const v = String(value ?? '').trim();
  if (!v) return false;
  if (BAD_VALUE.test(v)) return true;
  return /abnormal/i.test(key) && /^(yes|true)$/i.test(v);
}

/**
 * Walks a record into [{ label, value, remark, bad }] rows.
 * { value, remark } objects become one row; nested objects/arrays are walked.
 */
function flatten(node, prefix, out) {
  if (node === null || node === undefined || node === '') return out;

  if (Array.isArray(node)) {
    if (node.every((x) => x === null || typeof x !== 'object')) {
      const text = node.filter((x) => x !== null && x !== '').join(', ');
      if (text) out.push({ label: prefix, value: text, remark: '', bad: false });
    } else {
      node.forEach((item, i) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const fields = Object.entries(item).filter(([k]) => !SKIP_KEYS.has(k) && !/(^|_)id$/.test(k));
          if (fields.length && fields.every(([, v]) => v === null || typeof v !== 'object')) {
            const text = fields.map(([, v]) => v).filter((v) => v !== null && v !== '').join(' · ');
            if (text) {
              out.push({
                label: `${prefix} ${i + 1}`,
                value: text,
                remark: '',
                bad: fields.some(([k, v]) => isBad(k, v)),
              });
            }
            return;
          }
        }
        flatten(item, `${prefix} ${i + 1}`, out);
      });
    }
    return out;
  }

  if (typeof node === 'object') {
    if ('value' in node && Object.keys(node).every((k) => k === 'value' || k === 'remark')) {
      const value = node.value;
      if (value !== null && value !== undefined && value !== '') {
        out.push({
          label: prefix,
          value: String(value),
          remark: node.remark ? String(node.remark) : '',
          bad: isBad(prefix, value),
        });
      }
      return out;
    }
    Object.entries(node).forEach(([k, v]) => {
      if (SKIP_KEYS.has(k) || /(^|_)id$/.test(k)) return;
      flatten(v, prefix ? `${prefix} › ${prettify(k)}` : prettify(k), out);
    });
    return out;
  }

  const text = String(node);
  if (/^data:/i.test(text)) return out; // inline image
  out.push({ label: prefix, value: text, remark: '', bad: isBad(prefix, text) });
  return out;
}

const fmtDate = (d) => {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? String(d ?? '—')
    : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};
const fmtNow = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });

function buildMessage({ label, record, action, actorName, customRows, custom }) {
  const rows = custom ? [] : (customRows || flatten(record, '', [])).filter((r) => r.label);
  const bad = rows.filter((r) => r.bad);
  const updated = action === 'updated';
  const date = record.report_date || record.date || record.log_date || record.breakdown_date
    || record.inspection_date || record.created_at;

  let msg =
    `🏭 <b>${esc(label)}</b>${updated ? '  ✏️ <b>UPDATED</b>' : ''}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    (date ? `📅 <b>${fmtDate(date)}</b>\n` : '') +
    (record.recorded_by ? `👤 Recorded By: <b>${esc(record.recorded_by)}</b>\n` : '') +
    `${updated ? '✏️ Edited By' : '📝 Filled By'}: <b>${esc(actorName || record.filled_by_name || '—')}</b>\n` +
    `🕐 ${updated ? 'Edited' : 'Submitted'}: <b>${fmtNow()}</b>\n`;

  // A sheet can supply its own body (see entry.format in smsNotifyRegistry.js)
  if (custom) {
    msg += `${custom.html}`;
    return { msg, hasAlert: Boolean(custom.hasAlert) };
  }

  msg += bad.length
    ? `⚠️ <b>${bad.length} abnormal item${bad.length > 1 ? 's' : ''}</b>\n`
    : `✅ No abnormal items\n`;

  if (bad.length) {
    msg += `\n<b>Abnormal</b>\n` + bad.slice(0, 25).map((r) =>
      `• ${esc(truncate(r.label, 60))}: <b>${esc(truncate(r.value, 40))}</b>${r.remark ? ` — ${esc(truncate(r.remark, 80))}` : ''}`
    ).join('\n');
    if (bad.length > 25) msg += `\n… and ${bad.length - 25} more`;
  }

  const rest = rows.filter((r) => !r.bad);
  if (rest.length) {
    const MAX = 60;
    const lines = rest.slice(0, MAX).map((r) => `${truncate(r.label, 30)}: ${truncate(r.value, 40)}`);
    if (rest.length > MAX) lines.push(`… ${rest.length - MAX} more fields`);
    msg += `\n\n<b>Details</b>\n<pre>${esc(lines.join('\n'))}</pre>`;
  }

  return { msg, hasAlert: bad.length > 0 };
}

/** Loads the saved record through the sheet controller's own getById */
function loadRecord(controller, method, id, user) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 8000);
    const done = (payload) => {
      clearTimeout(timer);
      resolve(payload && payload.success !== false ? (payload.data ?? payload) : null);
    };
    const fakeRes = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { done(this.statusCode >= 400 ? null : payload); return this; },
      send(payload) { done(this.statusCode >= 400 ? null : payload); return this; },
      setHeader() { return this; },
      set() { return this; },
    };
    Promise.resolve(controller[method]({ params: { id: String(id) }, query: {}, body: {}, user }, fakeRes))
      .catch(() => { clearTimeout(timer); resolve(null); });
  });
}

async function dispatch(entry, id, action, user) {
  try {
    const record = await loadRecord(entry.controller, entry.method || 'getById', id, user);
    if (!record || typeof record !== 'object') return false;
    const customRows = entry.rows ? entry.rows(record) : null;
    const custom = entry.format ? entry.format(record) : null;
    const { msg, hasAlert } = buildMessage({ label: entry.label, record, action, actorName: user?.username, customRows, custom });
    const chatIds = await getSmsRecipientIds(entry.key, hasAlert);
    if (chatIds.length) await sendLongMessageToIds(chatIds, msg);
    return true;
  } catch (e) {
    console.error(`Telegram SMS notify error [${entry.key}]:`, e.message);
    return false;
  }
}

/**
 * registry: { '<route segment>': { key, label, controller, method?, rows? } }
 * `key` is the subscription key used on the Telegram settings screen.
 * `method` is the controller's by-id loader (default getById).
 * `rows(record)` optionally turns the record into [{ label, value, remark, bad }] for a nicer message.
 * `format(record)` optionally returns { html, hasAlert } to replace the whole message body.
 */
function smsNotifyMiddleware(registry) {
  return (req, res, next) => {
    if (req.method !== 'POST' && req.method !== 'PUT') return next();
    const m = /^\/([a-z0-9-]+)(?:\/(\d+))?\/?$/.exec(req.path);
    const entry = m && registry[m[1]];
    if (!entry) return next();
    if ((req.method === 'POST') === Boolean(m[2])) return next(); // POST has no id, PUT must have one

    const action = req.method === 'POST' ? 'created' : 'updated';
    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      const sent = originalJson(payload);
      if (res.statusCode >= 200 && res.statusCode < 300 && payload && payload.success !== false) {
        const id = m[2] || payload?.data?.id || payload?.id;
        if (id) setImmediate(() => dispatch(entry, id, action, req.user));
      }
      return sent;
    };
    return next();
  };
}

module.exports = { smsNotifyMiddleware, dispatch, buildMessage, flatten, isBad };
