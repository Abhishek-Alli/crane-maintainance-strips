/** SMS Ladle Car check sheet — keep in sync with backend/utils/smsLadleCarConfig.js */
import { todayISO } from './eotCraneConfig';

export const LADLE_CARS = ['1'];

export const MAX_PHOTOS_PER_POINT = 3;

export const REMARK = 'REMARK';
export const REMARK_PHOTO = 'REMARK_PHOTO';

export const LADLE_CAR_SECTIONS = [
  { key: 'gear_box_1', short: 'GB-1', label: 'Gear Box - 1' },
  { key: 'gear_box_2', short: 'GB-2', label: 'Gear Box - 2' },
  { key: 'wheel', short: 'Wheel', label: 'Ladle Car Wheel' },
];

// `where` names the point in messages, since both gear boxes share the same labels
const point = (section, key, label, options, alertValues, action) => ({
  section: section.key,
  key: `${section.key}_${key}`,
  label,
  where: `${section.short} ${label}`,
  options,
  alertValues,
  action,
});

const gearBoxPoints = (section) => [
  point(section, 'oil_level', 'Oil Level', ['OKAY', 'LOW'], ['LOW'], REMARK),
  point(section, 'oil_seal_leakage', 'Oil Seal Leakage', ['NO', 'YES'], ['YES'], REMARK_PHOTO),
  point(section, 'noise', 'Noise', ['NORMAL', 'ABNORMAL'], ['ABNORMAL'], REMARK),
  point(section, 'vibration', 'Vibration', ['NO', 'YES'], ['YES'], REMARK),
  point(section, 'coupling_nut_bolt', 'Coupling Nut & Bolt', ['TIGHT', 'LOOSE'], ['LOOSE'], REMARK_PHOTO),
  point(section, 'wheels_nut_bolt', 'Wheels Nut & Bolt', ['TIGHT', 'LOOSE'], ['LOOSE'], REMARK_PHOTO),
  point(section, 'brake_thruster', 'Brake Thruster Condition', ['OK', 'NOT OK'], ['NOT OK'], REMARK),
  point(section, 'brake_liners', 'Brake Liners', ['OKAY', 'NOT OKAY'], ['NOT OKAY'], REMARK),
];

const [GB1, GB2, WHEEL] = LADLE_CAR_SECTIONS;

export const LADLE_CAR_POINTS = [
  ...gearBoxPoints(GB1),
  ...gearBoxPoints(GB2),
  point(WHEEL, 'wheel_condition', 'Wheel Condition', ['OK', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
  point(WHEEL, 'bearing_block_greasing', 'Wheel Bearing Block Greasing', ['DONE', 'NOT DONE'], ['NOT DONE'], REMARK),
  point(WHEEL, 'floating_shaft', 'Floating Shaft Condition', ['OK', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
];

export const sectionPoints = (sectionKey) => LADLE_CAR_POINTS.filter((p) => p.section === sectionKey);

export function isAlert(p, value) {
  return Boolean(value) && p.alertValues.includes(value);
}

export function needsPhoto(p, value) {
  return isAlert(p, value) && p.action === REMARK_PHOTO;
}

export function actionLabel(p) {
  return p.action === REMARK_PHOTO ? 'Remark + Photo' : 'Remark';
}

export function emptyChecklistItems() {
  return Object.fromEntries(LADLE_CAR_POINTS.map((p) => [p.key, { value: '', remark: '' }]));
}

export function countAlerts(items) {
  if (!items || typeof items !== 'object') return 0;
  return LADLE_CAR_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/** Every missing compulsory check point entry: [{ key, where, message }]. photoCounts: { [key]: number } */
export function listChecklistIssues(items, photoCounts = {}) {
  const issues = [];
  LADLE_CAR_POINTS.forEach((p) => {
    const row = items[p.key] || {};
    const add = (message) => issues.push({ key: p.key, where: p.where, message });
    if (!row.value) add('Select a value');
    if (isAlert(p, row.value)) {
      if (!String(row.remark || '').trim()) add(`Remark required (${row.value})`);
      if (p.action === REMARK_PHOTO && !(photoCounts[p.key] > 0)) add(`Photo required (${row.value})`);
    }
    if ((photoCounts[p.key] || 0) > MAX_PHOTOS_PER_POINT) add(`Maximum ${MAX_PHOTOS_PER_POINT} photos`);
  });
  return issues;
}

export function emptyLadleCarForm() {
  return {
    report_date: todayISO(),
    recorded_by: '',
    ladle_car: '',
    checklist_items: emptyChecklistItems(),
  };
}
