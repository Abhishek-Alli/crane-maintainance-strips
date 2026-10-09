/** SMS Furnace Transformer check sheet — keep in sync with frontend/src/components/sms/furnaceTransformerConfig.js */

// The third name was cut off in the source sheet ("10 MVA (SINTE…") — confirm the full name
const FT_TRANSFORMERS = ['16 MVA (A)', '16 MVA (B)', '10 MVA (SINTER)'];

const FT_CHECKS = [
  { key: 'oil_level_in_mog', label: 'Oil Level in MOG', options: ['NORMAL', 'NOT NORMAL'] },
  { key: 'oil_leakages', label: 'Oil Leakages from any part', options: ['NO', 'YES'] },
  { key: 'silica_gel_condition', label: 'Silica Gel Condition', options: ['BLUE', 'NOT BLUE'] },
  { key: 'announciator_condition', label: 'Announciator Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'oil_pump_condition', label: 'Oil Pump Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'oil_pressure_switch_condition', label: 'Oil Pressure Switch Condition', options: ['OKAY', 'NOT OKAY'] },
];

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
  FT_CHECKS.forEach((c) => {
    const row = src[c.key] || {};
    const value = nullIfEmpty(row.value);
    out[c.key] = {
      value: value && c.options.includes(value) ? value : '',
      remark: nullIfEmpty(row.remark) || '',
    };
  });
  return out;
}

module.exports = { FT_TRANSFORMERS, FT_CHECKS, nullIfEmpty, parseNumber, normalizeChecks };
