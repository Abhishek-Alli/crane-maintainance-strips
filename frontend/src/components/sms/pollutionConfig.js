/** SMS Pollution Daily Check Sheet — keep in sync with backend/utils/smsPollutionConfig.js */
import { todayISO } from './eotCraneConfig';

export const POLLUTION_FURNACES = ['50 MT'];

export const MAX_PHOTOS_PER_POINT = 3;

export const REMARK = 'REMARK';
export const REMARK_PHOTO = 'REMARK_PHOTO';

const OK_NOT_OK = ['OK', 'NOT OK'];
const NO_YES = ['NO', 'YES'];

const section = (key, short, label) => ({ key, short, label });

// `where` names the point in messages, since many sections share the same labels.
// Weekly checks are optional on a daily sheet.
const point = (sec, key, label, options, alertValues, action, required = true) => ({
  section: sec.key,
  key: `${sec.key}_${key}`,
  label,
  where: `${sec.short} ${label}`,
  type: 'select',
  options,
  alertValues,
  action,
  required,
});

// Readings without a limit yet: recorded only, never an alert
const reading = (sec, key, label) => ({
  section: sec.key,
  key: `${sec.key}_${key}`,
  label,
  where: `${sec.short} ${label}`,
  type: 'number',
  required: true,
});

const conditionPoint = (sec) => point(sec, 'overall_condition', 'Overall Condition', OK_NOT_OK, ['NOT OK'], REMARK_PHOTO);
const soundPoint = (sec) => point(sec, 'abnormal_sound', 'Abnormal Sound during Operation', NO_YES, ['YES'], REMARK);

const hoodPoints = (sec) => [
  point(sec, 'gb_oil_level', 'Gear Box Oil Level (Weekly)', OK_NOT_OK, ['NOT OK'], REMARK, false),
  point(sec, 'pinion_teeth', 'Pinion Teeth Condition', OK_NOT_OK, ['NOT OK'], REMARK_PHOTO),
  point(sec, 'gb_abnormal_sound', 'Gear Box Abnormal Sound', NO_YES, ['YES'], REMARK),
];

const fanPoints = (sec) => [
  reading(sec, 'de_temp', 'DE Bearing - Temperature'),
  reading(sec, 'de_vibration', 'DE Bearing - Vibration'),
  reading(sec, 'nde_temp', 'NDE Bearing - Temperature'),
  reading(sec, 'nde_vibration', 'NDE Bearing - Vibration'),
  point(sec, 'coupling_sound', 'Coupling Abnormal Sound', NO_YES, ['YES'], REMARK),
  point(sec, 'inlet_damper', 'Fan Inlet Damper Condition', OK_NOT_OK, ['NOT OK'], REMARK_PHOTO),
  point(sec, 'actuator', 'Actuator Condition', OK_NOT_OK, ['NOT OK'], REMARK_PHOTO),
  point(sec, 'platform_clean', 'Fan Platform Overall Cleanliness (Weekly)', ['YES', 'NO'], ['NO'], REMARK_PHOTO, false),
];

const damperPoints = (sec) => [conditionPoint(sec), soundPoint(sec)];

const numbered = (prefix, short, label, count) =>
  Array.from({ length: count }, (_, i) => section(`${prefix}_${i + 1}`, `${short}-${i + 1}`, `${label}-${i + 1}`));

const SIDE_HOOD = section('side_hood', 'Side Hood', 'Swiveling Device of Side Hood');
const TOP_HOOD = section('top_hood', 'Top Hood', 'Swiveling Device of Top Hood');
const SIDE_DAMPER = section('side_suction', 'Side Suction', 'Suction Control Damper of Side Hood');
const TOP_DAMPER = section('top_suction', 'Top Suction', 'Suction Control Damper of Top Hood');
const SPARK = section('spark_arrestor', 'Spark Arrestor', 'Spark Arrestor');
const ID_FANS = numbered('id_fan', 'ID Fan', 'ID Fan Assy', 2);
const SWITCH_DAMPERS = numbered('switch_damper', 'SOD', 'Switch Over Damper', 8);
const REVERSE_DAMPERS = numbered('reverse_damper', 'RDD', 'Reverse Draft Damper', 2);
const EMERGENCY = section('emergency_damper', 'Emergency Damper', 'Emergency Damper');
const AIR_LOCKS = numbered('air_lock', 'RALV', 'Rotary Air Lock Valve', 8);
const VIBRATORS = numbered('vibrator', 'Vibrator', 'Vibrator', 8);

export const POLLUTION_SECTIONS = [
  SIDE_HOOD, TOP_HOOD, SIDE_DAMPER, TOP_DAMPER, SPARK,
  ...ID_FANS, ...SWITCH_DAMPERS, ...REVERSE_DAMPERS, EMERGENCY, ...AIR_LOCKS, ...VIBRATORS,
];

export const POLLUTION_POINTS = [
  ...hoodPoints(SIDE_HOOD),
  ...hoodPoints(TOP_HOOD),
  ...damperPoints(SIDE_DAMPER),
  ...damperPoints(TOP_DAMPER),
  point(SPARK, 'door_leakage', 'Any Leakage From Door', NO_YES, ['YES'], REMARK_PHOTO),
  ...ID_FANS.flatMap(fanPoints),
  ...SWITCH_DAMPERS.flatMap(damperPoints),
  ...REVERSE_DAMPERS.flatMap(damperPoints),
  ...damperPoints(EMERGENCY),
  ...AIR_LOCKS.flatMap(damperPoints),
  ...VIBRATORS.map((sec) => point(sec, 'condition_working', 'Overall Condition & Working', OK_NOT_OK, ['NOT OK'], REMARK_PHOTO)),
];

export const sectionPoints = (sectionKey) => POLLUTION_POINTS.filter((p) => p.section === sectionKey);

export function hasValue(value) {
  return value != null && String(value).trim() !== '';
}

const isNumeric = (value) => hasValue(value) && Number.isFinite(Number(value));

export function isAlert(p, value) {
  return p.type === 'select' && Boolean(value) && p.alertValues.includes(value);
}

export function needsPhoto(p, value) {
  return isAlert(p, value) && p.action === REMARK_PHOTO;
}

export function actionLabel(p) {
  return 'Remark';
}

export function emptyChecklistItems() {
  return Object.fromEntries(POLLUTION_POINTS.map((p) => [p.key, { value: '', remark: '' }]));
}

export function countAlerts(items) {
  if (!items || typeof items !== 'object') return 0;
  return POLLUTION_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/** Every missing compulsory check point entry: [{ key, where, message }]. photoCounts: { [key]: number } */
export function listChecklistIssues(items, photoCounts = {}) {
  const issues = [];
  POLLUTION_POINTS.forEach((p) => {
    const row = items[p.key] || {};
    const add = (message) => issues.push({ key: p.key, where: p.where, message });
    if (p.required && !hasValue(row.value)) add(p.type === 'number' ? 'Enter a value' : 'Select a value');
    else if (p.type === 'number' && hasValue(row.value) && !isNumeric(row.value)) add('Enter a valid number');
    if (isAlert(p, row.value)) {
      if (!String(row.remark || '').trim()) add(`Remark required (${row.value})`);
    }
    if ((photoCounts[p.key] || 0) > MAX_PHOTOS_PER_POINT) add(`Maximum ${MAX_PHOTOS_PER_POINT} photos`);
  });
  return issues;
}

export function emptyPollutionForm() {
  return {
    report_date: todayISO(),
    recorded_by: '',
    furnace: '',
    checklist_items: emptyChecklistItems(),
  };
}
