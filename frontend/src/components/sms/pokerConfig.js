/** SMS Hyd Poker Maintenance check sheet — keep in sync with backend/utils/smsPokerConfig.js */
import { todayISO } from './eotCraneConfig';
import { CRUCIBLE_FURNACES, CRUCIBLE_NUMBERS } from './crucibleConfig';

export const POKER_FURNACES = CRUCIBLE_FURNACES;
export const POKER_CRUCIBLES = CRUCIBLE_NUMBERS;

export const MAX_PHOTOS_PER_POINT = 3;

export const REMARK = 'REMARK';
export const REMARK_PHOTO = 'REMARK_PHOTO';

const point = (key, label, options, alertValues, action) => ({
  key, label, type: 'select', options, alertValues, action,
});

// Numeric reading; alert when outside min..max (both ends are OK)
const numberPoint = (key, label, min, max, action) => ({
  key, label, type: 'number', min, max, action,
});

export const POKER_POINTS = [
  point('hydraulic_oil_tank_level', 'Hydraulic Oil Tank Level', ['OK', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
  point('mould_length', 'Mould Length', ['SUFFICIENT', 'NEED TO CHANGE'], ['NEED TO CHANGE'], REMARK_PHOTO),
  point('seamless_pipe_line', 'Seamless Pipe Line Condition', ['OK', 'LEAKAGE'], ['LEAKAGE'], REMARK),
  point('flexible_hydraulic_pipe', 'Flexible Hydraulic Pipe', ['OK', 'LEAKAGE'], ['LEAKAGE'], REMARK_PHOTO),
  numberPoint('operating_pressure', 'Operating Pressure', 70, 120, REMARK_PHOTO),
  point('greasing_condition', 'Greasing Condition', ['DONE', 'NOT DONE'], ['NOT DONE'], REMARK),
];

/** Label with the allowed range for numeric points, e.g. 'Operating Pressure (70–120)' */
export function pointLabel(p) {
  return p.type === 'number' ? `${p.label} (${p.min}–${p.max})` : p.label;
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
    return n < p.min || n > p.max;
  }
  return p.alertValues.includes(value);
}

export function needsPhoto(p, value) {
  return isAlert(p, value) && p.action === REMARK_PHOTO;
}

export function actionLabel(p) {
  return 'Remark';
}

export function emptyChecklistItems() {
  return Object.fromEntries(POKER_POINTS.map((p) => [p.key, { value: '', remark: '' }]));
}

export function countAlerts(items) {
  if (!items || typeof items !== 'object') return 0;
  return POKER_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/** Every missing compulsory check point entry: [{ key, where, message }]. photoCounts: { [key]: number } */
export function listChecklistIssues(items, photoCounts = {}) {
  const issues = [];
  POKER_POINTS.forEach((p) => {
    const row = items[p.key] || {};
    const add = (message) => issues.push({ key: p.key, where: p.label, message });
    if (!hasValue(row.value)) add(p.type === 'number' ? 'Enter a value' : 'Select a value');
    else if (p.type === 'number' && !isNumeric(row.value)) add('Enter a valid number');
    if (isAlert(p, row.value)) {
      if (!String(row.remark || '').trim()) add(`Remark required (${row.value})`);
    }
    if ((photoCounts[p.key] || 0) > MAX_PHOTOS_PER_POINT) add(`Maximum ${MAX_PHOTOS_PER_POINT} photos`);
  });
  return issues;
}

export function emptyPokerForm() {
  return {
    report_date: todayISO(),
    recorded_by: '',
    furnace: '',
    crucible: '',
    checklist_items: emptyChecklistItems(),
  };
}
