/** SMS DM Unit check sheet — keep in sync with backend/utils/smsDmUnitConfig.js */
import { todayISO } from './eotCraneConfig';
import { CRUCIBLE_FURNACES, CRUCIBLE_NUMBERS } from './crucibleConfig';

export const DM_UNIT_FURNACES = CRUCIBLE_FURNACES;
export const DM_UNIT_CRUCIBLES = CRUCIBLE_NUMBERS;

export const MAX_PHOTOS_PER_POINT = 3;

export const REMARK = 'REMARK';
export const REMARK_PHOTO = 'REMARK_PHOTO';

const point = (key, label, options, alertValues, action) => ({
  key, label, type: 'select', options, alertValues, action,
});

// Numeric reading; alert below `min` or above `max` (the limit itself is OK)
const reading = (key, label, { min, max, unit }) => ({
  key, label, type: 'number', min, max, unit, action: REMARK_PHOTO,
});

export const DM_UNIT_POINTS = [
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

/** 'min 1 bar' / 'max 40 °C' for numeric points */
export function rangeText(p) {
  if (p.min != null) return `min ${p.min} ${p.unit}`;
  if (p.max != null) return `max ${p.max} ${p.unit}`;
  return '';
}

export function pointLabel(p) {
  return p.type === 'number' ? `${p.label} (${rangeText(p)})` : p.label;
}

export function hasValue(value) {
  return value != null && String(value).trim() !== '';
}

const isNumeric = (value) => hasValue(value) && Number.isFinite(Number(value));

export function isAlert(p, value) {
  if (!hasValue(value)) return false;
  if (p.type === 'number') {
    if (!isNumeric(value)) return false;
    const n = Number(value);
    return (p.min != null && n < p.min) || (p.max != null && n > p.max);
  }
  return p.alertValues.includes(value);
}

export function needsPhoto(p, value) {
  return isAlert(p, value) && p.action === REMARK_PHOTO;
}

export function actionLabel(p) {
  return p.action === REMARK_PHOTO ? 'Remark + Photo' : 'Remark';
}

export function emptyChecklistItems() {
  return Object.fromEntries(DM_UNIT_POINTS.map((p) => [p.key, { value: '', remark: '' }]));
}

export function countAlerts(items) {
  if (!items || typeof items !== 'object') return 0;
  return DM_UNIT_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/** Every missing compulsory check point entry: [{ key, where, message }]. photoCounts: { [key]: number } */
export function listChecklistIssues(items, photoCounts = {}) {
  const issues = [];
  DM_UNIT_POINTS.forEach((p) => {
    const row = items[p.key] || {};
    const add = (message) => issues.push({ key: p.key, where: p.label, message });
    if (!hasValue(row.value)) add(p.type === 'number' ? 'Enter a value' : 'Select a value');
    else if (p.type === 'number' && !isNumeric(row.value)) add('Enter a valid number');
    if (isAlert(p, row.value)) {
      if (!String(row.remark || '').trim()) add(`Remark required (${row.value})`);
      if (p.action === REMARK_PHOTO && !(photoCounts[p.key] > 0)) add(`Photo required (${row.value})`);
    }
    if ((photoCounts[p.key] || 0) > MAX_PHOTOS_PER_POINT) add(`Maximum ${MAX_PHOTOS_PER_POINT} photos`);
  });
  return issues;
}

export function emptyDmUnitForm() {
  return {
    report_date: todayISO(),
    recorded_by: '',
    furnace: '',
    crucible: '',
    coil: '',
    checklist_items: emptyChecklistItems(),
  };
}
