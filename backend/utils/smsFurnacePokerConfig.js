/** SMS Furnace Poker check sheet — keep in sync with frontend/src/components/sms/furnacePokerConfig.js */

const FPK_FURNACES = ['50 MT'];
const FPK_CRUCIBLES = ['1', '2'];

const FPK_CHECKS = [
  { key: 'panel_air_cleaning', label: 'Panel Air Cleaning', options: ['DONE', 'PREVIOUSLY DONE'], noBad: true },
  { key: 'panel_drive', label: 'Panel Drive', options: ['OKAY', 'NOT OKAY'] },
  { key: 'proximity_limit', label: 'Proximity Limit', options: ['OKAY', 'NOT OKAY'] },
  { key: 'wireless_remote_checking', label: 'Wireless Remote Checking', options: ['OKAY', 'NOT OKAY'] },
  { key: 'hydraulic_solonoid_valve', label: 'Hydraulic Solonoid Valve', options: ['OKAY', 'NOT OKAY'] },
];

const FPK_MOTORS = [
  { key: 'lt_motor_10', label: 'LT Motor (10 HP)' },
  { key: 'hydraulic_motor_40', label: 'Hydraulic Motor (40 HP)' },
];

const PHASES = ['r', 'y', 'b'];

const nullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** Returns a number, null for blank, or NaN for an invalid entry */
function parseNumber(v) {
  const s = nullIfEmpty(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Keeps only known checks with a valid option; missing/invalid values become empty */
function normalizeChecks(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  FPK_CHECKS.forEach((c) => {
    const row = src[c.key] || {};
    const value = nullIfEmpty(row.value);
    out[c.key] = {
      value: value && c.options.includes(value) ? value : '',
      remark: nullIfEmpty(row.remark) || '',
    };
  });
  return out;
}

/** Returns { currents } (numbers or null per phase) or { error } for a non-numeric entry */
function normalizeCurrents(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const m of FPK_MOTORS) {
    out[m.key] = {};
    for (const p of PHASES) {
      const n = parseNumber(src[m.key]?.[p]);
      if (Number.isNaN(n)) return { error: `${m.label} current must be a number` };
      out[m.key][p] = n;
    }
  }
  return { currents: out };
}

module.exports = {
  FPK_FURNACES, FPK_CRUCIBLES, FPK_CHECKS, FPK_MOTORS, nullIfEmpty, normalizeChecks, normalizeCurrents,
};
