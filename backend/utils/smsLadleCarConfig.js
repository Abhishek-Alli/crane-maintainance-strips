/** Shared SMS Ladle Car checklist definitions (backend) */

const LADLE_CAR_DEPARTMENT_NAME = 'FURNACE';
const LADLE_CARS = ['1'];

const MAX_PHOTOS_PER_POINT = 3;

const REMARK = 'REMARK';
const REMARK_PHOTO = 'REMARK_PHOTO';

const LADLE_CAR_SECTIONS = [
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

const LADLE_CAR_POINTS = [
  ...gearBoxPoints(GB1),
  ...gearBoxPoints(GB2),
  point(WHEEL, 'wheel_condition', 'Wheel Condition', ['OK', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
  point(WHEEL, 'bearing_block_greasing', 'Wheel Bearing Block Greasing', ['DONE', 'NOT DONE'], ['NOT DONE'], REMARK),
  point(WHEEL, 'floating_shaft', 'Floating Shaft Condition', ['OK', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
];

const POINT_BY_KEY = new Map(LADLE_CAR_POINTS.map((p) => [p.key, p]));

function nullIfEmpty(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function isAlert(p, value) {
  return Boolean(value) && p.alertValues.includes(value);
}

function needsPhoto(p, value) {
  return isAlert(p, value) && p.action === REMARK_PHOTO;
}

/** Drops unknown keys and values that are not a valid option. */
function normalizeChecklistItems(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  LADLE_CAR_POINTS.forEach((p) => {
    const row = src[p.key] || {};
    const value = nullIfEmpty(row.value);
    out[p.key] = {
      value: value && p.options.includes(value.toUpperCase()) ? value.toUpperCase() : null,
      remark: nullIfEmpty(row.remark),
    };
  });
  return out;
}

function countAlerts(items) {
  if (!items || typeof items !== 'object') return 0;
  return LADLE_CAR_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/**
 * Returns an error message for the first problem found, or null.
 * photoCounts: { [pointKey]: number } — photos attached to each point (kept + new).
 */
function findChecklistError(items, photoCounts = {}) {
  for (const p of LADLE_CAR_POINTS) {
    const row = items[p.key] || {};
    if (!row.value) return `${p.where} is required`;
    if (isAlert(p, row.value)) {
      if (!row.remark) return `Remark is required for ${p.where} (${row.value})`;
    }
    if ((photoCounts[p.key] || 0) > MAX_PHOTOS_PER_POINT) {
      return `Maximum ${MAX_PHOTOS_PER_POINT} photos allowed for ${p.where}`;
    }
  }
  return null;
}

module.exports = {
  LADLE_CAR_DEPARTMENT_NAME,
  LADLE_CARS,
  MAX_PHOTOS_PER_POINT,
  REMARK,
  REMARK_PHOTO,
  LADLE_CAR_SECTIONS,
  LADLE_CAR_POINTS,
  POINT_BY_KEY,
  nullIfEmpty,
  isAlert,
  needsPhoto,
  normalizeChecklistItems,
  countAlerts,
  findChecklistError,
};
