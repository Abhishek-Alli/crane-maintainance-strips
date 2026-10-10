/** SMS CCM Motor check sheet — keep in sync with frontend/src/components/sms/ccmMotorConfig.js */

const CCM_MOTOR_CHECKS = [
  { key: 'panel_air_cleaning', label: 'Panel Air Cleaning', options: ['OKAY', 'NOT OKAY'] },
  { key: 'drive_status', label: 'Drive Status', options: ['OKAY', 'NOT OKAY'] },
  { key: 'motor_condition', label: 'Motor Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'motor_temperature', label: 'Motor Temperature', options: ['NORMAL', 'NOT NORMAL'] },
  { key: 'any_abnormality', label: 'Any Abnormality', options: ['NO', 'YES'] },
  { key: 'starter_condition', label: 'Starter Condition', options: ['OKAY', 'NOT OKAY'] },
];

const nullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** Returns a number, null for blank, or NaN for an invalid entry */
function parseCurrent(v) {
  const s = nullIfEmpty(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Keeps only known checks with a valid option; missing/invalid values become empty */
function normalizeChecks(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  CCM_MOTOR_CHECKS.forEach((c) => {
    const row = src[c.key] || {};
    const value = nullIfEmpty(row.value);
    out[c.key] = {
      value: value && c.options.includes(value) ? value : '',
      remark: nullIfEmpty(row.remark) || '',
    };
  });
  return out;
}

module.exports = { CCM_MOTOR_CHECKS, nullIfEmpty, parseCurrent, normalizeChecks };
