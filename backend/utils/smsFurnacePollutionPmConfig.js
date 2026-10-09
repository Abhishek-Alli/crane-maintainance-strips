/** SMS Furnace Pollution — Scheduled PM check sheet — keep in sync with frontend/src/components/sms/furnacePollutionPmConfig.js */

const OPTIONS = ['OKAY', 'NOT OKAY'];

const numbered = (keyPrefix, label, count) =>
  Array.from({ length: count }, (_, i) => ({
    key: `${keyPrefix}_${i + 1}`,
    label: `${label}-${i + 1}`,
    options: OPTIONS,
  }));

const FP_PM_GROUPS = [
  {
    title: 'Hood',
    checks: [
      { key: 'top_hood_limit_switch', label: 'TOP HOOD LIMIT SWITCH', options: OPTIONS },
      { key: 'side_hood_limit_switch', label: 'SIDE HOOD LIMIT SWITCH', options: OPTIONS },
    ],
  },
  { title: 'RAV', checks: numbered('rav', 'RAV', 8) },
  { title: 'Vibrator Motor', checks: numbered('vibrator_motor', 'VIBRATOR MOTOR', 8) },
  { title: 'Solonoid Coil', checks: numbered('solonoid_coil', 'SOLONOID COIL', 8) },
];

const FP_PM_CHECKS = FP_PM_GROUPS.flatMap((g) => g.checks);

const nullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** Keeps only known checks with a valid option; missing/invalid values become empty */
function normalizeChecks(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  FP_PM_CHECKS.forEach((c) => {
    const row = src[c.key] || {};
    const value = nullIfEmpty(row.value);
    out[c.key] = {
      value: value && c.options.includes(value) ? value : '',
      remark: nullIfEmpty(row.remark) || '',
    };
  });
  return out;
}

module.exports = { FP_PM_GROUPS, FP_PM_CHECKS, nullIfEmpty, normalizeChecks };
