/** SMS Pump House (Mechanical) check sheet — keep in sync with backend/utils/smsPumpHouseConfig.js */
import { todayISO } from './eotCraneConfig';

export const MAX_PHOTOS_PER_POINT = 3;

export const REMARK = 'REMARK';
export const REMARK_PHOTO = 'REMARK_PHOTO';

// Header pressure below a pump's minPressure is an alert
const pumps = (count, minPressure) =>
  Array.from({ length: count }, (_, i) => ({ number: `PUMP-${i + 1}`, minPressure }));

export const PUMP_HOUSE_AREAS = [
  { name: 'EMERGENCY', pumps: pumps(2, 3) },
  { name: 'FURNACE', pumps: pumps(3, 3) },
  { name: 'HEAT EXCHANGER', pumps: pumps(3, 3) },
  { name: 'TRANSFORMER', pumps: pumps(2, 2) },
  { name: 'AC COOLING', pumps: pumps(2, 2) },
];

export function findPump(areaName, pumpNumber) {
  const area = PUMP_HOUSE_AREAS.find((a) => a.name === areaName);
  return area?.pumps.find((p) => p.number === pumpNumber) || null;
}

const point = (key, label, options, alertValues, action) => ({
  key, label, type: 'select', options, alertValues, action,
});

export const PUMP_HOUSE_POINTS = [
  { key: 'header_pressure', label: 'Header Pressure', type: 'number', action: REMARK_PHOTO },
  point('pump_vibration', 'Pump Vibration', ['NO', 'YES'], ['YES'], REMARK),
  point('base_frame_bolt', 'Base Frame Bolt', ['TIGHT', 'LOOSE'], ['LOOSE'], REMARK_PHOTO),
  point('pump_leakage', 'Pump Leakage', ['NO', 'YES'], ['YES'], REMARK_PHOTO),
  point('valve_condition', 'Valve Condition', ['OKAY', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
  point('pump_sounds', 'Pump Sounds', ['OKAY', 'NOT OK'], ['NOT OK'], REMARK),
  point('coupling_condition', 'Coupling Condition', ['OKAY', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
];

export const HEADER_PRESSURE_POINT = PUMP_HOUSE_POINTS.find((p) => p.key === 'header_pressure');

/** 'Header Pressure (min 3)' once the pump's limit is known */
export function pointLabel(p, minPressure) {
  return p.type === 'number' && minPressure != null ? `${p.label} (min ${minPressure})` : p.label;
}

export function hasValue(value) {
  return value != null && String(value).trim() !== '';
}

const isNumeric = (value) => hasValue(value) && Number.isFinite(Number(value));

/** minPressure: the selected pump's header pressure limit */
export function isAlert(p, value, minPressure) {
  if (!hasValue(value)) return false;
  if (p.type === 'number') {
    return isNumeric(value) && minPressure != null && Number(value) < minPressure;
  }
  return p.alertValues.includes(value);
}

export function needsPhoto(p, value, minPressure) {
  return isAlert(p, value, minPressure) && p.action === REMARK_PHOTO;
}

export function actionLabel(p) {
  return p.action === REMARK_PHOTO ? 'Remark + Photo' : 'Remark';
}

export function emptyChecklistItems() {
  return Object.fromEntries(PUMP_HOUSE_POINTS.map((p) => [p.key, { value: '', remark: '' }]));
}

export function countAlerts(items, minPressure) {
  if (!items || typeof items !== 'object') return 0;
  return PUMP_HOUSE_POINTS.filter((p) => isAlert(p, items[p.key]?.value, minPressure)).length;
}

/** Every missing compulsory check point entry: [{ key, where, message }]. photoCounts: { [key]: number } */
export function listChecklistIssues(items, photoCounts, minPressure) {
  const issues = [];
  PUMP_HOUSE_POINTS.forEach((p) => {
    const row = items[p.key] || {};
    const add = (message) => issues.push({ key: p.key, where: p.label, message });
    if (!hasValue(row.value)) add(p.type === 'number' ? 'Enter a value' : 'Select a value');
    else if (p.type === 'number' && !isNumeric(row.value)) add('Enter a valid number');
    if (isAlert(p, row.value, minPressure)) {
      if (!String(row.remark || '').trim()) add(`Remark required (${row.value})`);
      if (p.action === REMARK_PHOTO && !(photoCounts[p.key] > 0)) add(`Photo required (${row.value})`);
    }
    if ((photoCounts[p.key] || 0) > MAX_PHOTOS_PER_POINT) add(`Maximum ${MAX_PHOTOS_PER_POINT} photos`);
  });
  return issues;
}

export function emptyPumpHouseForm() {
  return {
    report_date: todayISO(),
    recorded_by: '',
    area: '',
    pump_number: '',
    checklist_items: emptyChecklistItems(),
  };
}
