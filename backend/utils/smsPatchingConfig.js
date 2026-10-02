/** Shared SMS Patching checklist definitions (backend) */

const PATCHING_DEPARTMENT_NAME = 'FURNACE';
const PATCHING_FURNACES = ['50 MT'];
const PATCHING_CRUCIBLES = ['1', '2'];

const OKAY_NOT_OK = ['OKAY', 'NOT OK'];

// Every alert needs a remark; this sheet has no photos
const point = (key, label, options, alertValues, required = true) => ({
  key, label, type: 'select', options, alertValues, required,
});

const PATCHING_POINTS = [
  point('patching_tools_condition', 'Patching Tools Condition', OKAY_NOT_OK, ['NOT OK'], false),
  point('furnace_crucible_cleaning', 'Furnace Crucible Cleaning', ['DONE', 'NOT DONE'], ['NOT DONE']),
  point('former_size', 'Former Size', OKAY_NOT_OK, ['NOT OK']),
  point('lining_machine_condition', 'Lining Machine Condition', OKAY_NOT_OK, ['NOT OK']),
  // Reading below min is an alert (min itself is OK)
  { key: 'air_pressure', label: 'Air Pressure', type: 'number', min: 6, unit: 'bar', required: true },
];

/** 'Air Pressure (min 6 bar)' for numeric points */
function pointLabel(p) {
  return p.type === 'number' ? `${p.label} (min ${p.min} ${p.unit})` : p.label;
}

function nullIfEmpty(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function toNumber(v) {
  const s = nullIfEmpty(v);
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function hasValue(value) {
  return value != null && value !== '';
}

function isAlert(p, value) {
  if (!hasValue(value)) return false;
  if (p.type === 'number') {
    const n = toNumber(value);
    return n != null && n < p.min;
  }
  return p.alertValues.includes(value);
}

/** Drops unknown keys, non-numeric readings and values that are not a valid option. */
function normalizeChecklistItems(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  PATCHING_POINTS.forEach((p) => {
    const row = src[p.key] || {};
    let value;
    if (p.type === 'number') {
      value = toNumber(row.value);
    } else {
      const s = nullIfEmpty(row.value);
      value = s && p.options.includes(s.toUpperCase()) ? s.toUpperCase() : null;
    }
    out[p.key] = { value, remark: nullIfEmpty(row.remark) };
  });
  return out;
}

function countAlerts(items) {
  if (!items || typeof items !== 'object') return 0;
  return PATCHING_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/** Returns an error message for the first problem found, or null. */
function findChecklistError(items) {
  for (const p of PATCHING_POINTS) {
    const row = items[p.key] || {};
    const where = pointLabel(p);
    if (p.required && !hasValue(row.value)) return `${where} is required`;
    if (isAlert(p, row.value) && !row.remark) return `Remark is required for ${where} (${row.value})`;
  }
  return null;
}

module.exports = {
  PATCHING_DEPARTMENT_NAME,
  PATCHING_FURNACES,
  PATCHING_CRUCIBLES,
  PATCHING_POINTS,
  pointLabel,
  nullIfEmpty,
  hasValue,
  isAlert,
  normalizeChecklistItems,
  countAlerts,
  findChecklistError,
};
