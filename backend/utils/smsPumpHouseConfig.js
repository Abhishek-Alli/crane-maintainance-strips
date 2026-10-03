/** Shared SMS Pump House (Mechanical) checklist definitions (backend) */

const PUMP_HOUSE_DEPARTMENT_NAME = 'FURNACE AND CCM';

const MAX_PHOTOS_PER_POINT = 3;

const REMARK = 'REMARK';
const REMARK_PHOTO = 'REMARK_PHOTO';

// Header pressure below a pump's minPressure is an alert
const pumps = (count, minPressure) =>
  Array.from({ length: count }, (_, i) => ({ number: `PUMP-${i + 1}`, minPressure }));

const PUMP_HOUSE_AREAS = [
  { name: 'EMERGENCY', pumps: pumps(2, 3) },
  { name: 'FURNACE', pumps: pumps(3, 3) },
  { name: 'HEAT EXCHANGER', pumps: pumps(3, 3) },
  { name: 'TRANSFORMER', pumps: pumps(2, 2) },
  { name: 'AC COOLING', pumps: pumps(2, 2) },
];

function findPump(areaName, pumpNumber) {
  const area = PUMP_HOUSE_AREAS.find((a) => a.name === areaName);
  return area?.pumps.find((p) => p.number === pumpNumber) || null;
}

const point = (key, label, options, alertValues, action) => ({
  key, label, type: 'select', options, alertValues, action,
});

const PUMP_HOUSE_POINTS = [
  { key: 'header_pressure', label: 'Header Pressure', type: 'number', action: REMARK_PHOTO },
  point('pump_vibration', 'Pump Vibration', ['NO', 'YES'], ['YES'], REMARK),
  point('base_frame_bolt', 'Base Frame Bolt', ['TIGHT', 'LOOSE'], ['LOOSE'], REMARK_PHOTO),
  point('pump_leakage', 'Pump Leakage', ['NO', 'YES'], ['YES'], REMARK_PHOTO),
  point('valve_condition', 'Valve Condition', ['OKAY', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
  point('pump_sounds', 'Pump Sounds', ['OKAY', 'NOT OK'], ['NOT OK'], REMARK),
  point('coupling_condition', 'Coupling Condition', ['OKAY', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
];

const POINT_BY_KEY = new Map(PUMP_HOUSE_POINTS.map((p) => [p.key, p]));

/** 'Header Pressure (min 3)' once the pump's limit is known */
function pointLabel(p, minPressure) {
  return p.type === 'number' && minPressure != null ? `${p.label} (min ${minPressure})` : p.label;
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

/** minPressure: the selected pump's header pressure limit */
function isAlert(p, value, minPressure) {
  if (!hasValue(value)) return false;
  if (p.type === 'number') {
    const n = toNumber(value);
    return n != null && minPressure != null && n < minPressure;
  }
  return p.alertValues.includes(value);
}

function needsPhoto(p, value, minPressure) {
  return isAlert(p, value, minPressure) && p.action === REMARK_PHOTO;
}

/** Drops unknown keys, non-numeric readings and values that are not a valid option. */
function normalizeChecklistItems(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  PUMP_HOUSE_POINTS.forEach((p) => {
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

function countAlerts(items, minPressure) {
  if (!items || typeof items !== 'object') return 0;
  return PUMP_HOUSE_POINTS.filter((p) => isAlert(p, items[p.key]?.value, minPressure)).length;
}

/**
 * Returns an error message for the first problem found, or null.
 * photoCounts: { [pointKey]: number } — photos attached to each point (kept + new).
 */
function findChecklistError(items, photoCounts, minPressure) {
  for (const p of PUMP_HOUSE_POINTS) {
    const row = items[p.key] || {};
    const where = pointLabel(p, minPressure);
    if (!hasValue(row.value)) return `${where} is required`;
    if (isAlert(p, row.value, minPressure)) {
      if (!row.remark) return `Remark is required for ${where} (${row.value})`;
    }
    if ((photoCounts[p.key] || 0) > MAX_PHOTOS_PER_POINT) {
      return `Maximum ${MAX_PHOTOS_PER_POINT} photos allowed for ${where}`;
    }
  }
  return null;
}

module.exports = {
  PUMP_HOUSE_DEPARTMENT_NAME,
  MAX_PHOTOS_PER_POINT,
  REMARK,
  REMARK_PHOTO,
  PUMP_HOUSE_AREAS,
  findPump,
  PUMP_HOUSE_POINTS,
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
