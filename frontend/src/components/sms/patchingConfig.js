/** SMS Patching check sheet — keep in sync with backend/utils/smsPatchingConfig.js */
import { todayISO } from './eotCraneConfig';

export const PATCHING_FURNACES = ['50 MT'];
export const PATCHING_CRUCIBLES = ['1', '2'];

const OKAY_NOT_OK = ['OKAY', 'NOT OK'];

// Every alert needs a remark; this sheet has no photos
const point = (key, label, options, alertValues, required = true) => ({
  key, label, type: 'select', options, alertValues, required,
});

export const PATCHING_POINTS = [
  point('patching_tools_condition', 'Patching Tools Condition', OKAY_NOT_OK, ['NOT OK'], false),
  point('furnace_crucible_cleaning', 'Furnace Crucible Cleaning', ['DONE', 'NOT DONE'], ['NOT DONE']),
  point('former_size', 'Former Size', OKAY_NOT_OK, ['NOT OK']),
  point('lining_machine_condition', 'Lining Machine Condition', OKAY_NOT_OK, ['NOT OK']),
  // Reading below min is an alert (min itself is OK)
  { key: 'air_pressure', label: 'Air Pressure', type: 'number', min: 6, unit: 'bar', required: true },
];

export const AIR_PRESSURE_POINT = PATCHING_POINTS.find((p) => p.key === 'air_pressure');

/** 'Air Pressure (min 6 bar)' for numeric points */
export function pointLabel(p) {
  return p.type === 'number' ? `${p.label} (min ${p.min} ${p.unit})` : p.label;
}

export function hasValue(value) {
  return value != null && String(value).trim() !== '';
}

const isNumeric = (value) => hasValue(value) && Number.isFinite(Number(value));

export function isAlert(p, value) {
  if (!hasValue(value)) return false;
  if (p.type === 'number') return isNumeric(value) && Number(value) < p.min;
  return p.alertValues.includes(value);
}

export function emptyChecklistItems() {
  return Object.fromEntries(PATCHING_POINTS.map((p) => [p.key, { value: '', remark: '' }]));
}

export function countAlerts(items) {
  if (!items || typeof items !== 'object') return 0;
  return PATCHING_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/** Every missing compulsory check point entry: [{ key, where, message }] */
export function listChecklistIssues(items) {
  const issues = [];
  PATCHING_POINTS.forEach((p) => {
    const row = items[p.key] || {};
    const add = (message) => issues.push({ key: p.key, where: p.label, message });
    if (p.required && !hasValue(row.value)) add(p.type === 'number' ? 'Enter a value' : 'Select a value');
    else if (p.type === 'number' && hasValue(row.value) && !isNumeric(row.value)) add('Enter a valid number');
    if (isAlert(p, row.value) && !String(row.remark || '').trim()) add(`Remark required (${row.value})`);
  });
  return issues;
}

export function emptyPatchingForm() {
  return {
    report_date: todayISO(),
    recorded_by: '',
    furnace: PATCHING_FURNACES[0],
    crucible: '',
    checklist_items: emptyChecklistItems(),
    general_remark: '',
  };
}
