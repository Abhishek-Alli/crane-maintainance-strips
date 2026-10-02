/** Shared SMS Crucible Maintenance checklist definitions (backend) */

const CRUCIBLE_DEPARTMENT_NAME = 'FURNACE';
const CRUCIBLE_FURNACES = ['26 MW'];
const CRUCIBLE_NUMBERS = ['1', '2'];

const MAX_PHOTOS_PER_POINT = 3;

const REMARK = 'REMARK';
const REMARK_PHOTO = 'REMARK_PHOTO';

const OKAY_NOT_OKAY = ['OKAY', 'NOT OKAY'];
const DONE_NOT_DONE = ['DONE', 'NOT DONE'];

const point = (key, label, options, alertValues, action = REMARK) => ({
  key, label, options, alertValues, action,
});

const condition = (key, label, action) => point(key, label, OKAY_NOT_OKAY, ['NOT OKAY'], action);
const greasing = (key, label) => point(key, label, DONE_NOT_DONE, ['NOT DONE']);

const CRUCIBLE_POINTS = [
  condition('water_cool_cable', 'Water Cool Cable'),
  condition('carbon_free_hose_pipe', 'Carbon Free Hose Pipe Condition'),
  condition('lamination_condition', 'Lamination Condition'),
  point('hydraulic_cylinder_oil_leakage', 'Hydraulic Cylinder Oil Leakage', ['YES', 'NO'], ['YES']),
  condition('coil_coating_condition', 'Coil Coating Condition'),
  condition('furnace_structure_bolt', 'Furnace Structure Bolt Condition', REMARK_PHOTO),
  greasing('hydraulic_cylinder_pin_bush_greasing', 'Hydraulic Cylinder Pin Bush Greasing'),
  condition('furnace_platform_condition', 'Furnace Platform Condition', REMARK_PHOTO),
  point('octo_busbar_bolt_nut', 'Octo Busbar Bolt Nut', ['OKAY', 'LOOSE', 'MELT'], ['LOOSE', 'MELT']),
  condition('top_block_condition', 'Top Block Condition'),
  condition('safety_plate_condition', 'Safety Plate Condition'),
  condition('structure_pin_condition', 'Structure Pin Condition'),
  greasing('structure_pin_greasing', 'Structure Pin Greasing'),
];

const POINT_BY_KEY = new Map(CRUCIBLE_POINTS.map((p) => [p.key, p]));

function nullIfEmpty(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** 'YYYY-MM-DDTHH:MM' (or with a space / seconds) → 'YYYY-MM-DD HH:MM', anything else → null */
function normalizeDateTime(v) {
  const m = String(v || '').trim().match(/^(\d{4}-\d{2}-\d{2})[T ]([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/);
  return m ? `${m[1]} ${m[2]}:${m[3]}` : null;
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
  CRUCIBLE_POINTS.forEach((p) => {
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
  return CRUCIBLE_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/**
 * Returns an error message for the first problem found, or null.
 * photoCounts: { [pointKey]: number } — photos attached to each point (kept + new).
 */
function findChecklistError(items, photoCounts = {}) {
  for (const p of CRUCIBLE_POINTS) {
    const row = items[p.key] || {};
    if (!row.value) return `${p.label} is required`;
    if (isAlert(p, row.value)) {
      if (!row.remark) return `Remark is required for ${p.label} (${row.value})`;
      if (p.action === REMARK_PHOTO && !(photoCounts[p.key] > 0)) {
        return `Photo is required for ${p.label} (${row.value})`;
      }
    }
    if ((photoCounts[p.key] || 0) > MAX_PHOTOS_PER_POINT) {
      return `Maximum ${MAX_PHOTOS_PER_POINT} photos allowed for ${p.label}`;
    }
  }
  return null;
}

module.exports = {
  CRUCIBLE_DEPARTMENT_NAME,
  CRUCIBLE_FURNACES,
  CRUCIBLE_NUMBERS,
  MAX_PHOTOS_PER_POINT,
  REMARK,
  REMARK_PHOTO,
  CRUCIBLE_POINTS,
  POINT_BY_KEY,
  nullIfEmpty,
  normalizeDateTime,
  isAlert,
  needsPhoto,
  normalizeChecklistItems,
  countAlerts,
  findChecklistError,
};
