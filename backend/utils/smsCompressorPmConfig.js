/** SMS Compressor — Scheduled PM check sheet — keep in sync with frontend/src/components/sms/compressorPmConfig.js */

const CP_CHECKS = [
  { key: 'coolent_filter_condition', label: 'Coolent and Filter Condition', options: ['OKAY', 'NOT OKAY'] },
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
  CP_CHECKS.forEach((c) => {
    const row = src[c.key] || {};
    const value = nullIfEmpty(row.value);
    out[c.key] = {
      value: value && c.options.includes(value) ? value : '',
      remark: nullIfEmpty(row.remark) || '',
    };
  });
  return out;
}

module.exports = { CP_CHECKS, nullIfEmpty, parseNumber, normalizeChecks };
