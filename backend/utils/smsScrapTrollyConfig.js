/** Shared SMS Scrap Transfer Trolly checklist definitions (backend) */

const SCRAP_TROLLY_DEPARTMENT_NAME = 'FURNACE';
const SCRAP_TROLLIES = ['1', '2'];

const MAX_PHOTOS_PER_POINT = 3;

const REMARK = 'REMARK';
const REMARK_PHOTO = 'REMARK_PHOTO';

const SCRAP_TROLLY_SECTIONS = [
  { key: 'gear_box', label: 'Gear Box' },
  { key: 'hydraulic', label: 'Hydraulic Power Pack' },
];

const point = (section, key, label, options, alertValues, action) => ({
  section, key, label, options, alertValues, action,
});

const SCRAP_TROLLY_POINTS = [
  point('gear_box', 'gb_oil_level', 'GB Oil Level', ['OKAY', 'LOW'], ['LOW'], REMARK),
  point('gear_box', 'gb_oil_seal_leakage', 'GB Oil Seal Leakage', ['NO', 'YES'], ['YES'], REMARK_PHOTO),
  point('gear_box', 'gb_noise', 'GB Noise', ['NORMAL', 'ABNORMAL'], ['ABNORMAL'], REMARK),
  point('gear_box', 'gb_vibration', 'GB Vibration', ['NO', 'YES'], ['YES'], REMARK),
  point('gear_box', 'gb_coupling_nut_bolt', 'GB Coupling Nut & Bolt', ['TIGHT', 'LOOSE'], ['LOOSE'], REMARK_PHOTO),
  point('gear_box', 'wheels_nut_bolt', 'Wheels Nut & Bolt', ['TIGHT', 'LOOSE'], ['LOOSE'], REMARK_PHOTO),
  point('hydraulic', 'hyd_oil_level', 'Hydraulic Oil Level', ['OK', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
  point('hydraulic', 'hyd_oil_leakage', 'Hydraulic Oil Leakage', ['NO', 'YES'], ['YES'], REMARK_PHOTO),
  point('hydraulic', 'hyd_hose_pipe_leakage', 'Hydraulic Flexible Hose Pipe Leakage', ['NO', 'YES'], ['YES'], REMARK_PHOTO),
  point('hydraulic', 'hyd_cylinder_seal', 'Hydraulic Cylinder Seal Condition', ['OK', 'NOT OK'], ['NOT OK'], REMARK_PHOTO),
];

const POINT_BY_KEY = new Map(SCRAP_TROLLY_POINTS.map((p) => [p.key, p]));

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
  SCRAP_TROLLY_POINTS.forEach((p) => {
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
  return SCRAP_TROLLY_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/**
 * Returns an error message for the first problem found, or null.
 * photoCounts: { [pointKey]: number } — photos attached to each point (kept + new).
 */
function findChecklistError(items, photoCounts = {}) {
  for (const p of SCRAP_TROLLY_POINTS) {
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
  SCRAP_TROLLY_DEPARTMENT_NAME,
  SCRAP_TROLLIES,
  MAX_PHOTOS_PER_POINT,
  REMARK,
  REMARK_PHOTO,
  SCRAP_TROLLY_SECTIONS,
  SCRAP_TROLLY_POINTS,
  POINT_BY_KEY,
  nullIfEmpty,
  isAlert,
  needsPhoto,
  normalizeChecklistItems,
  countAlerts,
  findChecklistError,
};
