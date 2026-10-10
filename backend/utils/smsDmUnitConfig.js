/** Shared SMS DM Unit checklist definitions (backend) */
const { CRUCIBLE_FURNACES, CRUCIBLE_NUMBERS } = require('./smsCrucibleConfig');

const DM_UNIT_DEPARTMENT_NAME = 'FURNACE';
const DM_UNIT_FURNACES = CRUCIBLE_FURNACES;
const DM_UNIT_CRUCIBLES = CRUCIBLE_NUMBERS;

const MAX_PHOTOS_PER_POINT = 3;

const REMARK = 'REMARK';
const REMARK_PHOTO = 'REMARK_PHOTO';

const point = (key, label, options, alertValues, action) => ({
  key, label, type: 'select', options, alertValues, action,
});

// Numeric reading; alert below `min` or above `max` (the limit itself is OK)
const reading = (key, label, { min, max, unit }) => ({
  key, label, type: 'number', min, max, unit, action: REMARK_PHOTO,
});

const DM_UNIT_POINTS = [
  point('mechanical_valve', 'Mechanical Valve', ['OK', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
  point('dm_water_leakage', 'DM Water Leakage', ['NOT LEAKAGE', 'LEAKAGE'], ['LEAKAGE'], REMARK_PHOTO),
  point('motor_pump_noise', 'Motor and Pump Noise', ['NORMAL', 'ABNORMAL'], ['ABNORMAL'], REMARK),
  point('motor_pump_vibration', 'Motor and Pump Vibration', ['NORMAL', 'ABNORMAL'], ['ABNORMAL'], REMARK),
  point('motor_foundation_bolt', 'Motor Foundation Bolt', ['TIGHT', 'LOOSE'], ['LOOSE'], REMARK_PHOTO),
  point('dm_water_level', 'DM Water Level', ['OK', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
  reading('hx_outlet_pressure', 'Heat Exchanger Outlet DM Water Pressure', { min: 1, unit: 'bar' }),
  reading('hx_outlet_temp', 'Heat Exchanger Outlet DM Water Temperature', { max: 40, unit: '°C' }),
  reading('hx_inlet_pressure', 'Heat Exchanger DM Water Inlet Pressure', { min: 3, unit: 'bar' }),
  reading('hx_inlet_temp', 'Heat Exchanger DM Water Inlet Temperature', { max: 40, unit: '°C' }),
];

const POINT_BY_KEY = new Map(DM_UNIT_POINTS.map((p) => [p.key, p]));

/** 'min 1 bar' / 'max 40 °C' for numeric points */
function rangeText(p) {
  if (p.min != null) return `min ${p.min} ${p.unit}`;
  if (p.max != null) return `max ${p.max} ${p.unit}`;
  return '';
}

function pointLabel(p) {
  return p.type === 'number' ? `${p.label} (${rangeText(p)})` : p.label;
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
    if (n == null) return false;
    return (p.min != null && n < p.min) || (p.max != null && n > p.max);
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
  DM_UNIT_POINTS.forEach((p) => {
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
  return DM_UNIT_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/**
 * Returns an error message for the first problem found, or null.
 * photoCounts: { [pointKey]: number } — photos attached to each point (kept + new).
 */
function findChecklistError(items, photoCounts = {}) {
  for (const p of DM_UNIT_POINTS) {
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
  DM_UNIT_DEPARTMENT_NAME,
  DM_UNIT_FURNACES,
  DM_UNIT_CRUCIBLES,
  MAX_PHOTOS_PER_POINT,
  REMARK,
  REMARK_PHOTO,
  DM_UNIT_POINTS,
  POINT_BY_KEY,
  rangeText,
  pointLabel,
  nullIfEmpty,
  hasValue,
  isAlert,
  needsPhoto,
  normalizeChecklistItems,
  countAlerts,
  findChecklistError,
};
