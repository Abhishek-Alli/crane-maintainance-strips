/** SMS Furnace Pollution daily check sheet — keep in sync with frontend/src/components/sms/furnacePollutionConfig.js */

const FP_FURNACES = ['50 MT'];

const FP_CHECKS = [
  { key: 'panel_condition', label: 'Panel Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'drive_1_check', label: 'Drive-1 Check', options: ['OKAY', 'NOT OKAY'] },
  { key: 'drive_2_check', label: 'Drive-2 Check', options: ['OKAY', 'NOT OKAY'] },
];

const FP_MOTORS = [
  { key: 'motor_737_1', label: 'Motor (737 HP)-1' },
  { key: 'motor_737_2', label: 'Motor (737 HP)-2' },
  { key: 'top_hood_15', label: 'Top Hood Motor (15 HP)' },
  { key: 'side_hood_15', label: 'Side Hood Motor (15 HP)' },
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
  FP_CHECKS.forEach((c) => {
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
  for (const m of FP_MOTORS) {
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
  FP_FURNACES, FP_CHECKS, FP_MOTORS, nullIfEmpty, parseNumber, normalizeChecks, normalizeCurrents,
};
