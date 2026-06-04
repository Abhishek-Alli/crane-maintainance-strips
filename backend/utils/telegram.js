// Telegram Bot Utility – HBM Checksheet System
// Tabular per-sheet notification templates for all 14 sheet types

const https = require('https');
const { query } = require('../config/database');

const BOT_TOKEN       = process.env.TELEGRAM_BOT_TOKEN;
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const TYPE_LABEL_TO_KEY = {
  'DC Motor':                                      'dc-motor',
  'Rolling Stand':                                 'rolling-stand',
  'Mill Mechanical':                               'mill-mech',
  'Cooling Bed':                                   'cooling-bed',
  'Pumphouse':                                     'pumphouse',
  'Bar Bundle Area':                               'bar-bundle',
  'Before Rolling':                                'before-rolling',
  'Pump Parameter Report':                         'pump-param',
  'Pump House Water Parameters':                   'water-param',
  'Pump House Maintenance Work Sheet':             'ph-maint',
  'Visual Inspection & HBM Transformer':           'transformer',
  'Daily Oil Level Sheet':                         'oil-level',
  'DC Motor Airflow, Temperature & Vibration':     'dc-motor-airflow',
  'Roughing Stand & Gearbox Bearing Temperature':  'roughing-gb-temp',
  'HBM Breakdown Report':                          'breakdown',
};

// ─── Core helpers ─────────────────────────────────────────────────────────────

function sendToChat(chatId, message) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' });
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const p = JSON.parse(data);
          if (p.ok) resolve(p);
          else { console.error(`Telegram error [${chatId}]:`, p.description); resolve(null); }
        } catch (e) { console.error('Telegram parse error:', e); resolve(null); }
      });
    });
    req.on('error', (e) => { console.error(`Telegram send error [${chatId}]:`, e.message); resolve(null); });
    req.write(payload);
    req.end();
  });
}

async function sendToIds(chatIds, message) {
  if (!BOT_TOKEN) { console.error('TELEGRAM_BOT_TOKEN not set'); return []; }
  if (!chatIds.length) { console.warn('No Telegram recipients'); return []; }
  const results = await Promise.all(chatIds.map((id) => sendToChat(id, message)));
  console.log(`Telegram: sent to ${results.filter(Boolean).length}/${chatIds.length}`);
  return results;
}

async function getAllChatIds() {
  const s = new Set();
  if (DEFAULT_CHAT_ID) s.add(DEFAULT_CHAT_ID);
  try {
    const { rows } = await query('SELECT chat_id FROM telegram_recipients WHERE is_active = true');
    rows.forEach((r) => s.add(r.chat_id));
  } catch (e) { console.error('getAllChatIds error:', e.message); }
  return [...s];
}

async function getChatIdsForType(typeKey) {
  const s = new Set();
  if (DEFAULT_CHAT_ID) s.add(DEFAULT_CHAT_ID);
  try {
    const { rows } = await query(
      `SELECT chat_id FROM telegram_recipients
       WHERE is_active = true AND (checksheet_types IS NULL OR $1 = ANY(checksheet_types))`,
      [typeKey]
    );
    rows.forEach((r) => s.add(r.chat_id));
  } catch (err) {
    console.error('getChatIdsForType error, falling back:', err.message);
    try {
      const { rows } = await query('SELECT chat_id FROM telegram_recipients WHERE is_active = true');
      rows.forEach((r) => s.add(r.chat_id));
    } catch (e) { console.error('Fallback error:', e.message); }
  }
  return [...s];
}

async function sendTelegramMessage(message) {
  return sendToIds(await getAllChatIds(), message);
}

async function sendTestMessage(chatId) {
  return sendToChat(chatId || DEFAULT_CHAT_ID, '✅ HBM System\nTelegram integration is working!');
}

async function sendLongMessageToIds(chatIds, text) {
  const MAX = 4000;
  if (text.length <= MAX) return sendToIds(chatIds, text);
  const lines = text.split('\n');
  const chunks = [];
  let cur = '';
  for (const line of lines) {
    if ((cur + '\n' + line).length > MAX) { if (cur) chunks.push(cur.trim()); cur = line; }
    else { cur = cur ? cur + '\n' + line : line; }
  }
  if (cur.trim()) chunks.push(cur.trim());
  for (const chunk of chunks) await sendToIds(chatIds, chunk);
}

async function sendLongMessage(text) {
  return sendLongMessageToIds(await getAllChatIds(), text);
}

// ─── Table builder helpers ────────────────────────────────────────────────────

const p  = (s, n) => String(s ?? '—').padEnd(n);    // pad right
const pL = (s, n) => String(s ?? '—').padStart(n);  // pad left
const hr = (cols) => cols.map((n) => '─'.repeat(n)).join('─┼─');
const row = (cells, cols) => cells.map((c, i) => p(c, cols[i])).join(' │ ');
const hdr = (cells, cols) => cells.map((c, i) => p(c, cols[i])).join(' │ ');

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';
const fmtSubmitted = (dt) => dt
  ? dt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
  : 'N/A';
const v = (val) => (val != null && val !== '') ? val : '—';
const sts = (s) => s === 'NOT_OK' ? 'NOK' : s === 'OFF' ? 'OFF' : s === 'LOW' ? 'LOW' : 'OK';

function msgHeader(icon, title, date, filledBy, submittedAt, extraLines = []) {
  return (
    `${icon} <b>${title}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📅 <b>${fmtDate(date)}</b>\n` +
    extraLines.filter(Boolean).map(l => `${l}\n`).join('') +
    `👤 Filled By: <b>${filledBy}</b>\n` +
    `🕐 Submitted: <b>${fmtSubmitted(submittedAt)}</b>\n`
  );
}

// ─── 1. Generic OK / NOT_OK checksheets ───────────────────────────────────────
// DC Motor · Pumphouse (plain sections, no named blocks)

async function sendHbmChecksheetNotification(opts) {
  const { checksheetType, date, time, shift, filledBy, submittedAt, remarks, items = [] } = opts;
  const typeKey = TYPE_LABEL_TO_KEY[checksheetType] || checksheetType.toLowerCase().replace(/\s+/g, '-');
  const chatIds = await getChatIdsForType(typeKey);
  if (!chatIds.length) { console.log(`Telegram: no recipients for "${checksheetType}"`); return []; }

  const notOk = items.filter(i => i.status === 'NOT_OK');
  const off   = items.filter(i => i.status === 'OFF');
  const ok    = items.filter(i => i.status !== 'NOT_OK' && i.status !== 'OFF');

  let msg = msgHeader('🔔', `${checksheetType} Checksheet`, date, filledBy, submittedAt,
    [(shift && `📋 Shift: <b>${shift}</b>`) || (time && `⏰ Time: <b>${time}</b>`) || null]
  );

  msg +=
    `📊 Total <b>${items.length}</b>  ` +
    `✅ OK <b>${ok.length}</b>  ` +
    `❌ NOT OK <b>${notOk.length}</b>` +
    (off.length ? `  ⭕ OFF <b>${off.length}</b>` : '') + '\n';

  if (remarks && remarks.trim()) msg += `📝 <i>${remarks.trim()}</i>\n`;

  if (notOk.length === 0) {
    msg += `\n✅ <b>All items OK — No issues found.</b>\n`;
  } else {
    const C = [24, 24, 22, 22];
    msg += `\n<pre>`;
    msg += ` ${hdr(['Section', 'Item', 'Remark', 'Action Taken'], C)}\n`;
    msg += ` ${hr(C)}\n`;
    for (const item of notOk) {
      const section = [item.block_name, item.section_name].filter(Boolean).join('>') || '—';
      msg += ` ${row([section, item.item_name, item.remark || '—', item.action_taken || '—'], C)}\n`;
    }
    msg += `</pre>`;
  }

  return sendLongMessageToIds(chatIds, msg);
}

// ─── Shared helper: full item list grouped by section (for sectioned sheets) ──
// Every item shown as a row: Item Name | ✓ / ✗ / - | Remark → Action (for NOK)

function buildSectionedMsg(icon, title, typeKey, sectionLabels, date, shift, time, filledBy, submittedAt, remarks, items) {
  const notOkItems = items.filter(i => i.status === 'NOT_OK');
  const offItems   = items.filter(i => i.status === 'OFF');
  const okItems    = items.filter(i => i.status !== 'NOT_OK' && i.status !== 'OFF');

  let msg = msgHeader(icon, `${title} Checksheet`, date, filledBy, submittedAt,
    [(shift && `📋 Shift: <b>${shift}</b>`) || (time && `⏰ Time: <b>${time}</b>`) || null]
  );
  msg +=
    `📊 Total <b>${items.length}</b>  ` +
    `✓ OK <b>${okItems.length}</b>  ` +
    `✗ NOK <b>${notOkItems.length}</b>` +
    (offItems.length ? `  - OFF <b>${offItems.length}</b>` : '') + '\n';
  if (remarks && remarks.trim()) msg += `📝 <i>${remarks.trim()}</i>\n`;

  // Group items by section, preserve section order
  const secOrder = [];
  const secGroups = {};
  for (const it of items) {
    const sec = it.section_name || 'General';
    if (!secGroups[sec]) { secGroups[sec] = []; secOrder.push(sec); }
    secGroups[sec].push(it);
  }

  // Use provided label order if given, otherwise use discovery order
  const orderedSections = sectionLabels.length
    ? sectionLabels.filter(s => secGroups[s])
    : secOrder;
  // Append any sections not in the label list (safety net)
  for (const s of secOrder) {
    if (!orderedSections.includes(s)) orderedSections.push(s);
  }

  // Column widths: Item | Sts | Remark → Action
  // Item name: 32, Status: 3, Remark+Action: 30
  const CI = [32, 3, 30];

  for (const secName of orderedSections) {
    const secItems = secGroups[secName];
    if (!secItems) continue;

    const nokInSec = secItems.filter(i => i.status === 'NOT_OK').length;
    const secSts   = nokInSec > 0 ? `✗ ${nokInSec} issue${nokInSec > 1 ? 's' : ''}` : '✓ All OK';

    msg += `\n<b>${secName}</b>  <i>${secSts}</i>\n<pre>`;
    msg += ` ${hdr(['Item', 'Sts', 'Remark / Action'], CI)}\n`;
    msg += ` ${hr(CI)}\n`;

    for (const it of secItems) {
      const itSts = it.status === 'NOT_OK' ? ' ✗ ' : it.status === 'OFF' ? ' - ' : ' ✓ ';
      let detail = '';
      if (it.status === 'NOT_OK') {
        const rem = (it.remark       || '').trim();
        const act = (it.action_taken || '').trim();
        detail = rem && act ? `${rem} → ${act}` : rem || act || '—';
      }
      // item_name may include block prefix like "Block > Item" — keep as-is, truncate at 32
      const itemLabel = String(it.item_name || '').slice(0, CI[0]);
      msg += ` ${row([itemLabel, itSts, detail], CI)}\n`;
    }
    msg += `</pre>`;
  }

  if (notOkItems.length === 0) msg += `\n✅ <b>All items OK — No issues found.</b>\n`;

  return msg;
}

// ─── 1b. Cooling Bed ─────────────────────────────────────────────────────────

const CB_SECTIONS = ['SECTION-1', 'SECTION-2', 'SECTION-3', 'SECTION-4', 'SECTION-5', 'SECTION-6'];
const CB_SECTION_LABELS = {
  'SECTION-1': 'SECTION-1 : Twin Channel',
  'SECTION-2': 'SECTION-2 : Rake',
  'SECTION-3': 'SECTION-3 : Aligner Roller',
  'SECTION-4': 'SECTION-4 : Layer Shifting Tray',
  'SECTION-5': 'SECTION-5 : Roller Conveyor',
  'SECTION-6': 'SECTION-6 : Cold Shear',
};

async function sendCoolingBedNotification({ date, time, shift, filledBy, submittedAt, remarks, items = [] }) {
  const chatIds = await getChatIdsForType('cooling-bed');
  if (!chatIds.length) return [];
  const labeledItems = items.map(i => ({ ...i, section_name: CB_SECTION_LABELS[i.section_name] || i.section_name }));
  const sectionLabels = CB_SECTIONS.map(s => CB_SECTION_LABELS[s]);
  const msg = buildSectionedMsg('🛏', 'Cooling Bed', 'cooling-bed', sectionLabels, date, shift, time, filledBy, submittedAt, remarks, labeledItems);
  return sendLongMessageToIds(chatIds, msg);
}

// ─── 1c. Mill Mechanical ──────────────────────────────────────────────────────

const MM_SECTION_LABELS = {
  'SECTION-1': 'SECTION-1 : Shear Machine',
  'SECTION-2': 'SECTION-2 : Pinch Roll & Tail Breaker',
  'SECTION-3': 'SECTION-3 : Looper',
  'SECTION-4': 'SECTION-4 : Quenching Box',
  'SECTION-5': 'SECTION-5 : Shifter',
};

async function sendMillMechNotification({ date, time, shift, filledBy, submittedAt, remarks, items = [] }) {
  const chatIds = await getChatIdsForType('mill-mech');
  if (!chatIds.length) return [];
  const labeledItems = items.map(i => ({ ...i, section_name: MM_SECTION_LABELS[i.section_name] || i.section_name }));
  const sectionLabels = Object.values(MM_SECTION_LABELS);
  const msg = buildSectionedMsg('⚙️', 'Mill Mechanical', 'mill-mech', sectionLabels, date, shift, time, filledBy, submittedAt, remarks, labeledItems);
  return sendLongMessageToIds(chatIds, msg);
}

// ─── 1d. Rolling Stand ────────────────────────────────────────────────────────

const RS_SECTION_LABELS = {
  'SECTION-1': 'SECTION-1 : Roughing Stand',
  'SECTION-2': 'SECTION-2 : C1 – C14 Stands',
};

async function sendRollingStandNotification({ date, time, shift, filledBy, submittedAt, remarks, items = [] }) {
  const chatIds = await getChatIdsForType('rolling-stand');
  if (!chatIds.length) return [];
  const labeledItems = items.map(i => ({ ...i, section_name: RS_SECTION_LABELS[i.section_name] || i.section_name }));
  const sectionLabels = Object.values(RS_SECTION_LABELS);
  const msg = buildSectionedMsg('🔄', 'Rolling Stand', 'rolling-stand', sectionLabels, date, shift, time, filledBy, submittedAt, remarks, labeledItems);
  return sendLongMessageToIds(chatIds, msg);
}

// ─── 1e. Bar Bundle Area ──────────────────────────────────────────────────────

const BB_SECTION_LABELS = {
  'SECTION-1': 'SECTION-1 : Roller Conveyor',
  'SECTION-2': 'SECTION-2 : Kick-Off Mechanisms',
  'SECTION-3': 'SECTION-3 : Chain Transfer Beds',
  'SECTION-4': 'SECTION-4 : Bending Machine',
};

async function sendBarBundleNotification({ date, time, shift, filledBy, submittedAt, remarks, items = [] }) {
  const chatIds = await getChatIdsForType('bar-bundle');
  if (!chatIds.length) return [];
  const labeledItems = items.map(i => ({ ...i, section_name: BB_SECTION_LABELS[i.section_name] || i.section_name }));
  const sectionLabels = Object.values(BB_SECTION_LABELS);
  const msg = buildSectionedMsg('📦', 'Bar Bundle Area', 'bar-bundle', sectionLabels, date, shift, time, filledBy, submittedAt, remarks, labeledItems);
  return sendLongMessageToIds(chatIds, msg);
}

// ─── 1f. Before Rolling ───────────────────────────────────────────────────────

const BR_SECTION_LABELS = {
  'SECTION-1': 'SECTION-1 : Rolling Stands C1–C14',
  'SECTION-2': 'SECTION-2 : Loopers & Snapshears',
  'SECTION-3': 'SECTION-3 : Pinch Rolls & Tail Breakers',
  'SECTION-4': 'SECTION-4 : Flying / Continue Shear',
};

async function sendBeforeRollingNotification({ date, time, shift, filledBy, submittedAt, remarks, checkedBy, millShiftIncharge, mechEngineer, items = [] }) {
  const chatIds = await getChatIdsForType('before-rolling');
  if (!chatIds.length) return [];
  const labeledItems = items.map(i => ({ ...i, section_name: BR_SECTION_LABELS[i.section_name] || i.section_name }));
  const sectionLabels = Object.values(BR_SECTION_LABELS);
  let msg = buildSectionedMsg('▶️', 'Before Rolling', 'before-rolling', sectionLabels, date, shift, time, filledBy, submittedAt, remarks, labeledItems);
  if (checkedBy || millShiftIncharge || mechEngineer) {
    msg += `\n`;
    if (checkedBy)         msg += `🔍 Checked By: <b>${checkedBy}</b>\n`;
    if (millShiftIncharge) msg += `👷 Mill Shift Incharge: <b>${millShiftIncharge}</b>\n`;
    if (mechEngineer)      msg += `🔧 Mech Engineer: <b>${mechEngineer}</b>\n`;
  }
  return sendLongMessageToIds(chatIds, msg);
}

// ─── 2. Oil Level Sheet ───────────────────────────────────────────────────────

async function sendOilLevelNotification({ date, shiftEng, readingBy, remark, entries = [], filledBy, submittedAt }) {
  const chatIds = await getChatIdsForType('oil-level');
  if (!chatIds.length) return [];

  const notOk = entries.filter(e => e.oil_status === 'NOT_OK').length;
  const low   = entries.filter(e => e.oil_status === 'LOW').length;
  const ok    = entries.length - notOk - low;

  let msg = msgHeader('🛢', 'Daily Oil Level Sheet', date, filledBy, submittedAt, [
    shiftEng  && `⚙️ Shift Eng: <b>${shiftEng}</b>`,
    readingBy && `📖 Reading By: <b>${readingBy}</b>`,
  ]);
  msg +=
    `📊 Tanks <b>${entries.length}</b>  ✅ OK <b>${ok}</b>` +
    (low   ? `  🟡 LOW <b>${low}</b>`   : '') +
    (notOk ? `  ❌ NOK <b>${notOk}</b>` : '') + '\n';
  if (remark && remark.trim()) msg += `📝 <i>${remark.trim()}</i>\n`;

  // Table
  const C = [22, 7, 7, 6, 5];   // Tank | Level | Press | Temp | Sts
  msg += `\n<pre>`;
  msg += ` ${hdr(['Tank Name', 'Level', 'Press', 'Temp', 'Sts'], C)}\n`;
  msg += ` ${hr(C)}\n`;
  for (const e of entries) {
    const s = e.oil_status === 'NOT_OK' ? 'NOK' : e.oil_status === 'LOW' ? 'LOW' : 'OK ';
    msg += ` ${row([e.tank_name, v(e.oil_level), v(e.pressure), v(e.temperature) !== '—' ? v(e.temperature)+'C' : '—', s], C)}\n`;
  }
  msg += `</pre>`;

  return sendLongMessageToIds(chatIds, msg);
}

// ─── 3. DC Motor Airflow ──────────────────────────────────────────────────────

async function sendDcMotorAirflowNotification({ date, shiftEng, readingBy, remark, entries = [], filledBy, submittedAt }) {
  const chatIds = await getChatIdsForType('dc-motor-airflow');
  if (!chatIds.length) return [];

  const hasIssue = (e) => [
    e.kpa_status, e.dc_motor_temp_status, e.de_bearing_temp_status,
    e.nde_bearing_temp_status, e.blower_motor_temp_status,
    e.motor_center_vib_status, e.blower_vib_status,
  ].some(s => s === 'NOT_OK');
  const issues = entries.filter(hasIssue).length;

  let msg = msgHeader('🌡', 'DC Motor Airflow Report', date, filledBy, submittedAt, [
    shiftEng  && `⚙️ Shift Eng: <b>${shiftEng}</b>`,
    readingBy && `📖 Reading By: <b>${readingBy}</b>`,
  ]);
  msg +=
    `📊 Stands <b>${entries.length}</b>  ✅ Normal <b>${entries.length - issues}</b>` +
    (issues ? `  ❌ Issues <b>${issues}</b>` : '') + '\n';
  if (remark && remark.trim()) msg += `📝 <i>${remark.trim()}</i>\n`;

  // Table: Stand | KPa | Mtr°C | DE°C | NDE°C | Vib | Sts
  const C = [7, 5, 6, 6, 6, 5, 4];
  msg += `\n<pre>`;
  msg += ` ${hdr(['Stand', 'KPa', 'Mtr°C', 'DE°C', 'NDE°C', 'Vib', 'Sts'], C)}\n`;
  msg += ` ${hr(C)}\n`;
  for (const e of entries) {
    const s = hasIssue(e) ? 'NOK' : 'OK ';
    msg += ` ${row([
      e.stand_name,
      v(e.running_kpa),
      v(e.dc_motor_temp),
      v(e.de_bearing_temp),
      v(e.nde_bearing_temp),
      v(e.motor_center_vib),
      s,
    ], C)}\n`;
  }
  msg += `</pre>`;

  // Detail rows for any NOK stands
  const nokStands = entries.filter(hasIssue);
  if (nokStands.length) {
    msg += `\n❌ <b>Issues Detail</b>\n`;
    for (const e of nokStands) {
      const flags = [
        e.kpa_status               === 'NOT_OK' && 'KPa',
        e.dc_motor_temp_status     === 'NOT_OK' && 'Mtr Temp',
        e.de_bearing_temp_status   === 'NOT_OK' && 'DE Bearing',
        e.nde_bearing_temp_status  === 'NOT_OK' && 'NDE Bearing',
        e.motor_center_vib_status  === 'NOT_OK' && 'Vibration',
        e.air_flow_condition       === 'NOT_OK' && 'Air Flow',
      ].filter(Boolean).join(', ');
      msg += `  ❌ <b>${e.stand_name}</b> — ${flags}\n`;
    }
  }

  return sendLongMessageToIds(chatIds, msg);
}

// ─── 4. Pump Parameter Report ─────────────────────────────────────────────────

async function sendPumpParamNotification({ date, sizeValue, entries = [], sec2Items = [], filledBy, submittedAt }) {
  const chatIds = await getChatIdsForType('pump-param');
  if (!chatIds.length) return [];

  const running = entries.filter(e => e.status !== 'OFF').length;
  const off     = entries.filter(e => e.status === 'OFF').length;

  let msg = msgHeader('📊', 'Pump Parameter Report', date, filledBy, submittedAt, [
    sizeValue && `📏 Size: <b>${sizeValue}</b>`,
  ]);
  msg +=
    `📊 Pumps <b>${entries.length}</b>  ▶️ Running <b>${running}</b>` +
    (off ? `  ⭕ OFF <b>${off}</b>` : '') + '\n';

  // Main pump table: Pump | Sts | KW | Amp | RPM | Prs | Ld%
  const C = [20, 4, 6, 5, 6, 5, 5];
  msg += `\n<pre>`;
  msg += ` ${hdr(['Pump Name', 'Sts', 'KW', 'Amp', 'RPM', 'Prs', 'Ld%'], C)}\n`;
  msg += ` ${hr(C)}\n`;
  for (const e of entries) {
    const s = e.status === 'OFF' ? 'OFF ' : 'ON  ';
    msg += ` ${row([
      e.pump_name,
      s,
      v(e.kw),
      v(e.amp),
      v(e.rpm),
      v(e.pressure),
      v(e.load_pct),
    ], C)}\n`;
  }
  msg += `</pre>`;

  // KWh diff table (separate, only if values exist)
  const withKwh = entries.filter(e => e.kwh_diff != null && e.kwh_diff !== '');
  if (withKwh.length) {
    const C2 = [20, 10];
    msg += `\n<pre>`;
    msg += ` ${hdr(['Pump Name', 'KWh Diff'], C2)}\n`;
    msg += ` ${hr(C2)}\n`;
    for (const e of withKwh) {
      msg += ` ${row([e.pump_name, v(e.kwh_diff)], C2)}\n`;
    }
    msg += `</pre>`;
  }

  // Section 2 checks table
  if (sec2Items && sec2Items.length) {
    const C3 = [24, 14, 5];
    msg += `\n<b>Additional Checks</b>\n<pre>`;
    msg += ` ${hdr(['Item', 'Value', 'Sts'], C3)}\n`;
    msg += ` ${hr(C3)}\n`;
    for (const item of sec2Items) {
      const s = item.item_status === 'NOT_OK' ? 'NOK' : item.item_status === 'OFF' ? 'OFF' : 'OK ';
      msg += ` ${row([item.item_name, v(item.value_text), s], C3)}\n`;
    }
    msg += `</pre>`;
  }

  return sendLongMessageToIds(chatIds, msg);
}

// ─── 5. Water Parameters ──────────────────────────────────────────────────────

async function sendWaterParamNotification({ date, remark, entries = [], filledBy, submittedAt }) {
  const chatIds = await getChatIdsForType('water-param');
  if (!chatIds.length) return [];

  const hasIssue = (e) => [e.tds_status, e.hardness_status, e.ph_status, e.temp_status].some(s => s === 'NOT_OK');
  const issues   = entries.filter(hasIssue).length;

  let msg = msgHeader('🧪', 'Water Parameters Report', date, filledBy, submittedAt);
  msg +=
    `📊 Sources <b>${entries.length}</b>  ✅ Normal <b>${entries.length - issues}</b>` +
    (issues ? `  ❌ Issues <b>${issues}</b>` : '') + '\n';
  if (remark && remark.trim()) msg += `📝 <i>${remark.trim()}</i>\n`;

  // Table: Source | TDS | Hardness | pH | Temp | Sts
  const C = [20, 6, 8, 5, 5, 4];
  msg += `\n<pre>`;
  msg += ` ${hdr(['Water Source', 'TDS', 'Hardness', 'pH', 'Temp', 'Sts'], C)}\n`;
  msg += ` ${hr(C)}\n`;
  for (const e of entries) {
    const overall = hasIssue(e) ? 'NOK' : 'OK ';
    msg += ` ${row([
      e.water_source,
      v(e.tds),
      v(e.hardness),
      v(e.ph),
      v(e.temperature) !== '—' ? `${v(e.temperature)}C` : '—',
      overall,
    ], C)}\n`;
  }
  msg += `</pre>`;

  // Show which params failed
  const nokEntries = entries.filter(hasIssue);
  if (nokEntries.length) {
    msg += `\n❌ <b>Parameter Issues</b>\n`;
    for (const e of nokEntries) {
      const flags = [
        e.tds_status      === 'NOT_OK' && `TDS(${v(e.tds)})`,
        e.hardness_status === 'NOT_OK' && `Hard(${v(e.hardness)})`,
        e.ph_status       === 'NOT_OK' && `pH(${v(e.ph)})`,
        e.temp_status     === 'NOT_OK' && `Temp(${v(e.temperature)})`,
      ].filter(Boolean).join(', ');
      msg += `  ❌ <b>${e.water_source}</b> — ${flags}\n`;
    }
  }

  return sendLongMessageToIds(chatIds, msg);
}

// ─── 6. PH Maintenance Work Sheet ────────────────────────────────────────────

async function sendPhMaintNotification({ date, items = [], filledBy, submittedAt }) {
  const chatIds = await getChatIdsForType('ph-maint');
  if (!chatIds.length) return [];

  let msg = msgHeader('🔧', 'PH Maintenance Work Sheet', date, filledBy, submittedAt);
  msg += `📋 Work Items: <b>${items.length}</b>\n`;

  const C = [3, 52];
  msg += `\n<pre>`;
  msg += ` ${hdr(['No', 'Work Description'], C)}\n`;
  msg += ` ${hr(C)}\n`;
  items.forEach((item, i) => {
    const text = String(item.item_text || item);
    // wrap long lines
    if (text.length <= C[1]) {
      msg += ` ${row([String(i + 1), text], C)}\n`;
    } else {
      msg += ` ${row([String(i + 1), text.slice(0, C[1])], C)}\n`;
      let rest = text.slice(C[1]);
      while (rest.length) {
        msg += ` ${row(['', rest.slice(0, C[1])], C)}\n`;
        rest = rest.slice(C[1]);
      }
    }
  });
  msg += `</pre>`;

  return sendLongMessageToIds(chatIds, msg);
}

// ─── 7. HBM Transformer ───────────────────────────────────────────────────────

async function sendTransformerNotification({ date, sec1 = [], sec2 = [], sec3 = [], sec2Remark, sec3Remark, filledBy, submittedAt }) {
  const chatIds = await getChatIdsForType('transformer');
  if (!chatIds.length) return [];

  let msg = msgHeader('⚡', 'HBM Transformer Inspection', date, filledBy, submittedAt);
  msg += `📊 Units: <b>${sec1.length}</b>\n`;

  // Section 1 — readings per unit
  if (sec1.length) {
    const C = [22, 10, 10, 8, 8, 9, 9];
    msg += `\n<b>Section 1 — Transformer Readings</b>\n<pre>`;
    msg += ` ${hdr(['Unit', 'HT-Amp', 'HT-Volt', 'Wnd°C', 'Oil°C', 'TankLvl', 'OLTCLvl'], C)}\n`;
    msg += ` ${hr(C)}\n`;
    for (const u of sec1) {
      msg += ` ${row([
        u.unit_name,
        v(u.ht_current),
        v(u.ht_volt),
        v(u.wind_temperature),
        v(u.oil_temperature),
        v(u.main_tank_oil_level),
        v(u.oltc_oil_level),
      ], C)}\n`;
    }
    msg += `</pre>`;

    // Silica gel + condition checks
    const C2 = [22, 8, 8, 8, 8, 10];
    msg += `\n<pre>`;
    msg += ` ${hdr(['Unit', 'SilGel', 'TapPos', 'Clean', 'Leakge', 'Relay'], C2)}\n`;
    msg += ` ${hr(C2)}\n`;
    for (const u of sec1) {
      msg += ` ${row([
        u.unit_name,
        v(u.silica_gel_color),
        v(u.tap_position),
        v(u.cleaning),
        v(u.oil_leakage),
        v(u.relay_condition),
      ], C2)}\n`;
    }
    msg += `</pre>`;
  }

  // Section 2 — Tap changer
  if (sec2.length) {
    const C = [22, 9, 9, 8];
    msg += `\n<b>Section 2 — Tap Changer Count</b>\n<pre>`;
    msg += ` ${hdr(['Unit', 'Today', 'Ystrday', 'Diff'], C)}\n`;
    msg += ` ${hr(C)}\n`;
    for (const u of sec2) {
      msg += ` ${row([u.unit_name, v(u.today_tap_count), v(u.yesterday_tap_count), v(u.difference)], C)}\n`;
    }
    msg += `</pre>`;
    if (sec2Remark && sec2Remark.trim()) msg += `📝 <i>${sec2Remark.trim()}</i>\n`;
  }

  // Section 3 — Energy meter
  if (sec3.length) {
    const C = [22, 9, 9, 9, 9];
    msg += `\n<b>Section 3 — Energy Meter</b>\n<pre>`;
    msg += ` ${hdr(['Unit', 'KWh-T', 'KWh-Y', 'KWh-D', 'KVAh-D'], C)}\n`;
    msg += ` ${hr(C)}\n`;
    for (const u of sec3) {
      msg += ` ${row([u.unit_name, v(u.today_kwh), v(u.yesterday_kwh), v(u.diff_kwh), v(u.diff_kvah)], C)}\n`;
    }
    msg += `</pre>`;
    if (sec3Remark && sec3Remark.trim()) msg += `📝 <i>${sec3Remark.trim()}</i>\n`;
  }

  return sendLongMessageToIds(chatIds, msg);
}

// ─── 8. Roughing Stand & Gearbox Bearing Temperature ─────────────────────────

async function sendRoughingGbTempNotification({ date, shiftEng, tempTakenBy, s1, stands = [], sec1Remark, sec2Remark, sec3Remark, filledBy, submittedAt }) {
  const chatIds = await getChatIdsForType('roughing-gb-temp');
  if (!chatIds.length) return [];

  const filledStands = stands.filter(s =>
    [s.gb_de, s.gb_inter, s.gb_output_top, s.gb_output_bot, s.gb_gearbox].some(x => x != null && x !== '')
  );

  let msg = msgHeader('🌡', 'Roughing GB Bearing Temp', date, filledBy, submittedAt, [
    shiftEng    && `⚙️ Shift Eng: <b>${shiftEng}</b>`,
    tempTakenBy && `📖 Temp By: <b>${tempTakenBy}</b>`,
  ]);
  msg += `📊 C-Stands filled: <b>${filledStands.length}</b>/14\n`;

  // Section 1 — Roughing Stand
  if (s1) {
    const C = [14, 7, 7];
    msg += `\n<b>Section 1 — Roughing Stand</b>\n<pre>`;
    msg += ` ${hdr(['Component', 'DE', 'NDE'], C)}\n`;
    msg += ` ${hr(C)}\n`;
    if (s1.flywheel_de   != null) msg += ` ${row(['Flywheel',    v(s1.flywheel_de),   v(s1.flywheel_nde)],  C)}\n`;
    if (s1.reduction_de  != null) msg += ` ${row(['Reduction GB', v(s1.reduction_de),  v(s1.reduction_nde)], C)}\n`;
    msg += `</pre>`;

    const hasPinion = [s1.pinion_de_top, s1.pinion_de_mid, s1.pinion_de_bot].some(x => x != null);
    const hasStand  = [s1.stand_de_top,  s1.stand_de_mid,  s1.stand_de_bot ].some(x => x != null);
    if (hasPinion || hasStand) {
      const C2 = [14, 7, 7, 7];
      msg += `<pre>`;
      msg += ` ${hdr(['Component', 'Top', 'Mid', 'Bot'], C2)}\n`;
      msg += ` ${hr(C2)}\n`;
      if (hasPinion) {
        msg += ` ${row(['Pinion DE',  v(s1.pinion_de_top),  v(s1.pinion_de_mid),  v(s1.pinion_de_bot)],  C2)}\n`;
        msg += ` ${row(['Pinion NDE', v(s1.pinion_nde_top), v(s1.pinion_nde_mid), v(s1.pinion_nde_bot)], C2)}\n`;
      }
      if (hasStand) {
        msg += ` ${row(['Stand DE',   v(s1.stand_de_top),   v(s1.stand_de_mid),   v(s1.stand_de_bot)],   C2)}\n`;
        msg += ` ${row(['Stand NDE',  v(s1.stand_nde_top),  v(s1.stand_nde_mid),  v(s1.stand_nde_bot)],  C2)}\n`;
      }
      msg += `</pre>`;
    }
    if (sec1Remark && sec1Remark.trim()) msg += `📝 <i>${sec1Remark.trim()}</i>\n`;
  }

  // Section 2 — Gearbox bearing per C-stand
  if (filledStands.length) {
    const C = [5, 6, 6, 7, 7, 7];
    msg += `\n<b>Section 2 — Gearbox Bearing</b>\n<pre>`;
    msg += ` ${hdr(['Stand', 'DE', 'Inter', 'Out-T', 'Out-B', 'GB'], C)}\n`;
    msg += ` ${hr(C)}\n`;
    for (const s of filledStands) {
      msg += ` ${row([s.stand_name, v(s.gb_de), v(s.gb_inter), v(s.gb_output_top), v(s.gb_output_bot), v(s.gb_gearbox)], C)}\n`;
    }
    msg += `</pre>`;
    if (sec2Remark && sec2Remark.trim()) msg += `📝 <i>${sec2Remark.trim()}</i>\n`;
  }

  // Section 3 — Stand bearing per C-stand
  const bearingStands = stands.filter(s =>
    [s.s_de_top, s.s_de_bot, s.s_nde_top, s.s_nde_bot].some(x => x != null && x !== '')
  );
  if (bearingStands.length) {
    const C = [5, 7, 7, 8, 8];
    msg += `\n<b>Section 3 — Stand Bearing</b>\n<pre>`;
    msg += ` ${hdr(['Stand', 'DE-Top', 'DE-Bot', 'NDE-Top', 'NDE-Bot'], C)}\n`;
    msg += ` ${hr(C)}\n`;
    for (const s of bearingStands) {
      msg += ` ${row([s.stand_name, v(s.s_de_top), v(s.s_de_bot), v(s.s_nde_top), v(s.s_nde_bot)], C)}\n`;
    }
    msg += `</pre>`;
    if (sec3Remark && sec3Remark.trim()) msg += `📝 <i>${sec3Remark.trim()}</i>\n`;
  }

  return sendLongMessageToIds(chatIds, msg);
}

// ─── 9. HBM Breakdown Report ──────────────────────────────────────────────────

async function sendBreakdownNotification({ date, size, filledBy, submittedAt, slots = [] }) {
  const chatIds = await getChatIdsForType('breakdown');
  if (!chatIds.length) return [];

  const allEntries = slots.flatMap(s => (s.entries || []).filter(e => e.breakdown_type));
  const sumByType  = (type) => allEntries
    .filter(e => e.breakdown_type === type)
    .reduce((acc, e) => acc + (parseInt(e.breakdown_minutes) || 0), 0);

  const mill   = sumByType('Mill Breakdown');
  const mech   = sumByType('Mechanical Breakdown');
  const elec   = sumByType('Electrical Breakdown');
  const rhf    = sumByType('RHF Breakdown');
  const tmt    = mill + mech + elec + rhf;
  const maint  = sumByType('Mill Maintenance');
  const kv132  = sumByType('132 KV Breakdown');
  const rhfLow = sumByType('RHF Low Temperature');
  const cold   = sumByType('Cold, CCM Chilli & Piping Breakdown');
  const ccm    = sumByType('CCM Heat Over');
  const other  = sumByType('Other');
  const cont   = sumByType('Contractor Mistake');
  const total  = tmt + maint + kv132 + rhfLow + cold + ccm + other + cont;

  const totalMissRoll   = slots.reduce((acc, s) => acc + (parseInt(s.miss_roll)    || 0), 0);
  const totalMissRoll18 = slots.reduce((acc, s) => acc + (parseInt(s.miss_roll_18) || 0), 0);
  const activeSlots     = slots.filter(s => (s.entries || []).some(e => e.breakdown_type));

  let msg = msgHeader('🔴', 'HBM Breakdown Report', date, filledBy, submittedAt, [
    `📏 Size: <b>${size}</b>`,
    `🎯 Miss Roll: <b>${totalMissRoll}</b>  |  18" Miss Roll: <b>${totalMissRoll18}</b>`,
  ]);

  // Summary table
  const C = [36, 6];
  msg += `\n<b>Summary</b>\n<pre>`;
  msg += ` ${hdr(['Breakdown Type', 'Min'], C)}\n`;
  msg += ` ${hr(C)}\n`;
  msg += ` ${row(['Mill Breakdown',                       pL(mill,   C[1])], C)}\n`;
  msg += ` ${row(['Mechanical Breakdown',                 pL(mech,   C[1])], C)}\n`;
  msg += ` ${row(['Electrical Breakdown',                 pL(elec,   C[1])], C)}\n`;
  msg += ` ${row(['RHF Breakdown',                        pL(rhf,    C[1])], C)}\n`;
  msg += ` ${hr(C)}\n`;
  msg += ` ${row(['TMT (HBM) Total Breakdown Time',       pL(tmt,    C[1])], C)}\n`;
  msg += ` ${hr(C)}\n`;
  msg += ` ${row(['Mill Maintenance Time',                pL(maint,  C[1])], C)}\n`;
  msg += ` ${row(['132 KV Breakdown',                     pL(kv132,  C[1])], C)}\n`;
  msg += ` ${row(['RHF Low Temperature',                  pL(rhfLow, C[1])], C)}\n`;
  msg += ` ${row(['Cold/CCM Chilli/Piping Breakdown',     pL(cold,   C[1])], C)}\n`;
  msg += ` ${row(['CCM Heat Over',                        pL(ccm,    C[1])], C)}\n`;
  msg += ` ${row(['Other',                                pL(other,  C[1])], C)}\n`;
  msg += ` ${row(['Contractor Mistake',                   pL(cont,   C[1])], C)}\n`;
  msg += ` ${hr(C)}\n`;
  msg += ` ${row(['TOTAL BREAKDOWN TIME',                 pL(total,  C[1])], C)}\n`;
  msg += `</pre>`;

  // Slot-wise table (only active slots)
  if (activeSlots.length) {
    const C2 = [13, 32, 5];
    msg += `\n<b>Slot-wise Details</b>\n<pre>`;
    msg += ` ${hdr(['Slot', 'Breakdown Type', 'Min'], C2)}\n`;
    msg += ` ${hr(C2)}\n`;
    for (const slot of activeSlots) {
      const validEntries = (slot.entries || []).filter(e => e.breakdown_type);
      let first = true;
      for (const e of validEntries) {
        msg += ` ${row([first ? slot.slot_label : '', e.breakdown_type, pL(e.breakdown_minutes || 0, C2[2])], C2)}\n`;
        if (e.breakdown_reason && e.breakdown_reason.trim()) {
          msg += `   > ${e.breakdown_reason.trim()}\n`;
        }
        first = false;
      }
      msg += ` ${hr(C2)}\n`;
    }
    msg += `</pre>`;
  }

  if (total === 0) msg += `\n✅ <b>No breakdown recorded for this shift.</b>\n`;

  return sendLongMessageToIds(chatIds, msg);
}

// ─── Daily Status Summary ─────────────────────────────────────────────────────

const SHEET_TABLES = [
  { key: 'dc-motor',         label: 'DC Motor',                          table: 'hbm_dc_motor_logs' },
  { key: 'rolling-stand',    label: 'Rolling Stand',                     table: 'hbm_rolling_stand_logs' },
  { key: 'mill-mech',        label: 'Mill Mechanical',                   table: 'hbm_mill_mech_logs' },
  { key: 'cooling-bed',      label: 'Cooling Bed',                       table: 'hbm_cooling_bed_logs' },
  { key: 'pumphouse',        label: 'Pumphouse',                         table: 'hbm_pumphouse_logs' },
  { key: 'bar-bundle',       label: 'Bar Bundle Area',                   table: 'hbm_bar_bundle_logs' },
  { key: 'before-rolling',   label: 'Before Rolling',                    table: 'hbm_before_rolling_logs' },
  { key: 'pump-param',       label: 'Pump Parameter Report',             table: 'hbm_pump_param_logs' },
  { key: 'water-param',      label: 'Water Parameters',                  table: 'hbm_water_param_logs' },
  { key: 'ph-maint',         label: 'PH Maintenance',                    table: 'hbm_ph_maint_logs' },
  { key: 'transformer',      label: 'HBM Transformer',                   table: 'hbm_transformer_logs' },
  { key: 'oil-level',        label: 'Daily Oil Level',                   table: 'hbm_oil_level_logs' },
  { key: 'dc-motor-airflow', label: 'DC Motor Airflow',                  table: 'hbm_dc_motor_airflow_logs' },
  { key: 'roughing-gb-temp', label: 'Roughing Stand & GB Temp',          table: 'hbm_roughing_gb_temp_logs' },
  { key: 'breakdown',        label: 'HBM Breakdown Report',              table: 'hbm_breakdown_logs' },
];

function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

async function sendDailyStatusSummary(date) {
  const chatIds = await getAllChatIds();
  if (!chatIds.length) return;

  // Collect status for every sheet
  const rows = [];
  for (const sheet of SHEET_TABLES) {
    try {
      const todayRes = await query(
        `SELECT l.log_date, u.username as filled_by
         FROM ${sheet.table} l JOIN users u ON l.filled_by = u.id
         WHERE l.log_date = $1 ORDER BY l.created_at DESC LIMIT 1`,
        [date]
      );
      if (todayRes.rows.length) {
        rows.push({ label: sheet.label, status: 'today', dateStr: '', filledBy: todayRes.rows[0].filled_by });
        continue;
      }
      const recentRes = await query(
        `SELECT l.log_date, u.username as filled_by
         FROM ${sheet.table} l JOIN users u ON l.filled_by = u.id
         ORDER BY l.log_date DESC LIMIT 1`
      );
      if (recentRes.rows.length) {
        rows.push({ label: sheet.label, status: 'prev', dateStr: fmtDateShort(recentRes.rows[0].log_date), filledBy: recentRes.rows[0].filled_by });
      } else {
        rows.push({ label: sheet.label, status: 'none', dateStr: '', filledBy: '—' });
      }
    } catch (e) {
      rows.push({ label: sheet.label, status: 'none', dateStr: '', filledBy: '—' });
    }
  }

  const total    = rows.length;
  const todayCnt = rows.filter(r => r.status === 'today').length;
  const prevCnt  = rows.filter(r => r.status === 'prev').length;
  const noneCnt  = rows.filter(r => r.status === 'none').length;

  // Column widths
  const C1 = 2;   // #
  const C2 = 22;  // Sheet Name
  const C3 = 12;  // Status
  const C4 = 12;  // Filled By

  const rpad = (s, n) => String(s).substring(0, n).padEnd(n);
  const lpad = (s, n) => String(s).substring(0, n).padStart(n);
  const sep  = `${'─'.repeat(C1)}─${'─'.repeat(C2)}─${'─'.repeat(C3)}─${'─'.repeat(C4)}`;

  let table = '';
  table += `${rpad('#', C1)} ${rpad('Sheet', C2)} ${rpad('Status', C3)} ${rpad('Filled By', C4)}\n`;
  table += sep + '\n';

  rows.forEach((r, i) => {
    const num   = lpad(i + 1, C1);
    const label = rpad(r.label, C2);
    const name  = rpad(r.filledBy || '—', C4);
    let   sts;
    if (r.status === 'today')     sts = rpad('✅ Filled',      C3);
    else if (r.status === 'prev') sts = rpad(`⚠ ${r.dateStr}`, C3);
    else                          sts = rpad('❌ Not Filled',   C3);
    table += `${num} ${label} ${sts} ${name}\n`;
  });

  table += sep + '\n';
  table += `${rpad('', C1)} ${rpad(`Total: ${total}  ✅${todayCnt}  ⚠${prevCnt}  ❌${noneCnt}`, C2 + C3 + C4 + 2)}`;

  const displayDate = fmtDateShort(date);
  const genTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

  let msg  = `<b>📋 HBM Daily Sheet Status</b>\n`;
  msg     += `📅 <b>${displayDate}</b>  ⏰ ${genTime}\n`;
  msg     += `<pre>${table}</pre>`;

  await sendToIds(chatIds, msg);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  sendTelegramMessage,
  sendTestMessage,
  sendToChat,
  sendLongMessage,
  sendHbmChecksheetNotification,
  sendCoolingBedNotification,
  sendMillMechNotification,
  sendRollingStandNotification,
  sendBarBundleNotification,
  sendBeforeRollingNotification,
  sendOilLevelNotification,
  sendDcMotorAirflowNotification,
  sendPumpParamNotification,
  sendWaterParamNotification,
  sendPhMaintNotification,
  sendTransformerNotification,
  sendRoughingGbTempNotification,
  sendBreakdownNotification,
  sendDailyStatusSummary,
};
