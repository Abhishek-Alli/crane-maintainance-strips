/** SMS Furnace Stand By check sheet — keep in sync with frontend/src/components/sms/furnaceStandByConfig.js */

const FSB_FURNACES = ['50 MT'];
const FSB_CRUCIBLES = ['1', '2'];

const FSB_CHECKS = [
  { key: 'lamination_sensor', label: 'Lamination Sensor', options: ['OKAY', 'NOT OKAY'] },
  { key: 'coil_cooling_sensor', label: 'Coil Cooling Sensor', options: ['OKAY', 'NOT OKAY'] },
  { key: 'furnace_hydraulic_limit', label: 'Furnace Hydraulic Limit', options: ['OKAY', 'NOT OKAY'] },
  { key: 'all_rtd_checking', label: 'All RTD Checking', options: ['OKAY', 'NOT OKAY'] },
];

const nullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** Keeps only known checks with a valid option; missing/invalid values become empty */
function normalizeChecks(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  FSB_CHECKS.forEach((c) => {
    const row = src[c.key] || {};
    const value = nullIfEmpty(row.value);
    out[c.key] = {
      value: value && c.options.includes(value) ? value : '',
      remark: nullIfEmpty(row.remark) || '',
    };
  });
  return out;
}

module.exports = { FSB_FURNACES, FSB_CRUCIBLES, FSB_CHECKS, nullIfEmpty, normalizeChecks };
