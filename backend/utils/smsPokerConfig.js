/** Shared SMS Hyd Poker Maintenance checklist definitions (backend) */
const { CRUCIBLE_FURNACES, CRUCIBLE_NUMBERS } = require('./smsCrucibleConfig');

const POKER_DEPARTMENT_NAME = 'FURNACE';
const POKER_FURNACES = CRUCIBLE_FURNACES;
const POKER_CRUCIBLES = CRUCIBLE_NUMBERS;

const MAX_PHOTOS_PER_POINT = 3;

const REMARK = 'REMARK';
const REMARK_PHOTO = 'REMARK_PHOTO';

const point = (key, label, options, alertValues, action) => ({
  key, label, type: 'select', options, alertValues, action,
});

// Numeric reading; alert when outside min..max (both ends are OK)
const numberPoint = (key, label, min, max, action) => ({
  key, label, type: 'number', min, max, action,
});

const POKER_POINTS = [
  point('hydraulic_oil_tank_level', 'Hydraulic Oil Tank Level', ['OK', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
  point('mould_length', 'Mould Length', ['SUFFICIENT', 'NEED TO CHANGE'], ['NEED TO CHANGE'], REMARK_PHOTO),
  point('seamless_pipe_line', 'Seamless Pipe Line Condition', ['OK', 'LEAKAGE'], ['LEAKAGE'], REMARK),
  point('flexible_hydraulic_pipe', 'Flexible Hydraulic Pipe', ['OK', 'LEAKAGE'], ['LEAKAGE'], REMARK_PHOTO),
  numberPoint('operating_pressure', 'Operating Pressure', 70, 120, REMARK_PHOTO),
  point('greasing_condition', 'Greasing Condition', ['DONE', 'NOT DONE'], ['NOT DONE'], REMARK),
];

const POINT_BY_KEY = new Map(POKER_POINTS.map((p) => [p.key, p]));

/** Label with the allowed range for numeric points, e.g. 'Operating Pressure (70–120)' */
function pointLabel(p) {
  return p.type === 'number' ? `${p.label} (${p.min}–${p.max})` : p.label;
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
    return n != null && (n < p.min || n > p.max);
  }
  return p.alertValues.includes(value);
}

function needsPhoto(p, value) {
  return isAlert(p, value) && p.action === REMARK_PHOTO;
}

/** Drops unknown keys, non-numeric readings and values that are not a valid option. */
function normalizeChecklistItems(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  POKER_POINTS.forEach((p) => {
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
  return POKER_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/**
 * Returns an error message for the first problem found, or null.
 * photoCounts: { [pointKey]: number } — photos attached to each point (kept + new).
 */
function findChecklistError(items, photoCounts = {}) {
  for (const p of POKER_POINTS) {
    const row = items[p.key] || {};
    const where = pointLabel(p);
    if (!hasValue(row.value)) return `${where} is required`;
    if (isAlert(p, row.value)) {
      if (!row.remark) return `Remark is required for ${where} (${row.value})`;
    }
    if ((photoCounts[p.key] || 0) > MAX_PHOTOS_PER_POINT) {
      return `Maximum ${MAX_PHOTOS_PER_POINT} photos allowed for ${where}`;
    }
  }
  return null;
}

module.exports = {
  POKER_DEPARTMENT_NAME,
  POKER_FURNACES,
  POKER_CRUCIBLES,
  MAX_PHOTOS_PER_POINT,
  REMARK,
  REMARK_PHOTO,
  POKER_POINTS,
  POINT_BY_KEY,
  pointLabel,
  nullIfEmpty,
  hasValue,
  isAlert,
  needsPhoto,
  normalizeChecklistItems,
  countAlerts,
  findChecklistError,
};
