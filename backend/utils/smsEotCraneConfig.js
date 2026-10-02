/** Shared SMS EOT Crane Maintenance (Mechanical) checklist definitions (backend) */

const EOT_DEPARTMENT_NAME = 'FURNACE';

const MAX_PHOTOS_PER_POINT = 3;

const REMARK = 'REMARK';
const REMARK_PHOTO = 'REMARK_PHOTO';

const point = (key, label, options, alertValues, action, required = true) => ({
  key, label, options, alertValues, action, required,
});

const oilLevel = () => point('oil_level', 'Oil Level', ['OKAY', 'LOW'], ['LOW'], REMARK);
const oilSealLeakage = () => point('oil_seal_leakage', 'Oil Seal Leakage', ['YES', 'NO'], ['YES'], REMARK_PHOTO);
const noise = (required = true) => point('noise', 'Noise', ['NORMAL', 'ABNORMAL'], ['ABNORMAL'], REMARK, required);
const vibration = () => point('vibration', 'Vibration', ['YES', 'NO'], ['YES'], REMARK);
const couplingNutBolt = () => point('coupling_nut_bolt', 'Coupling Nut & Bolt', ['TIGHT', 'LOOSE'], ['LOOSE'], REMARK_PHOTO);
const wheelsNutBolt = () => point('wheels_nut_bolt', 'Wheels Nut & Bolt', ['TIGHT', 'LOOSE'], ['LOOSE'], REMARK_PHOTO);
const brakeThrusterOil = () => point('brake_thruster_oil_level', 'Brake Thruster Oil Level', ['OK', 'LOW'], ['LOW'], REMARK);
const brakeLiners = () => point('brake_liners', 'Brake Liners', ['OKAY', 'NOT OKAY'], ['NOT OKAY'], REMARK_PHOTO);
const wheelsCondition = () => point('wheels_condition', 'Wheels Condition', ['OKAY', 'NOT OKAY'], ['NOT OKAY'], REMARK_PHOTO, false);
const wireRopeCondition = () => point('wire_rope_condition', 'Wire Rope Condition', ['OKAY', 'NOT OKAY'], ['NOT OKAY'], REMARK_PHOTO);
const wireRopeDrum = () => point(
  'wire_rope_drum',
  'Wire Rope Drum',
  ['OKAY', 'WELDING BREAK', 'BEARING DAMAGE', 'DRUM GROOVE ISSUE'],
  ['WELDING BREAK', 'BEARING DAMAGE', 'DRUM GROOVE ISSUE'],
  REMARK_PHOTO
);

// Brake thruster oil level is checked only on MH-2 and the auxiliary hoist
const basePoints = (noiseRequired = true) => [
  oilLevel(),
  oilSealLeakage(),
  noise(noiseRequired),
  vibration(),
  couplingNutBolt(),
  wheelsNutBolt(),
];

const ltPoints = (noiseRequired = true) => [...basePoints(noiseRequired), brakeLiners(), wheelsCondition()];
const ctPoints = () => [...basePoints(), brakeLiners(), wireRopeCondition(), wireRopeDrum(), wheelsCondition()];
const hoistPoints = (withThruster) => [
  ...basePoints(),
  ...(withThruster ? [brakeThrusterOil()] : []),
  brakeLiners(),
];

const EOT_SECTIONS = [
  { key: 'lt_gear_box_1', short: 'LT-1', label: 'LT Gear Box - 1 (Cabin Side)', points: ltPoints(false) },
  { key: 'lt_gear_box_2', short: 'LT-2', label: 'LT Gear Box - 2 (Cabin Opposite Side)', points: ltPoints() },
  { key: 'ct_1', short: 'CT-1', label: 'CT-1 (Cabin Side)', points: ctPoints() },
  { key: 'ct_2', short: 'CT-2', label: 'CT-2 (Opposite Cabin Side)', points: ctPoints() },
  { key: 'main_hoist_1', short: 'MH-1', label: 'Main Hoist-1 (Cabin Side)', points: hoistPoints(false) },
  { key: 'main_hoist_2', short: 'MH-2', label: 'Main Hoist-2 (Opposite Side)', points: hoistPoints(true) },
  { key: 'aux_hoist', short: 'AH', label: 'Auxiliary Hoist', points: hoistPoints(true) },
];

const SIDE_1 = ['lt_gear_box_1', 'lt_gear_box_2', 'ct_1', 'main_hoist_1'];
const BOTH_SIDES = ['lt_gear_box_1', 'lt_gear_box_2', 'ct_1', 'ct_2', 'main_hoist_1', 'main_hoist_2'];
const SIDE_1_AUX = [...SIDE_1, 'aux_hoist'];

const crane = (number, capacity, sections) => ({ number, capacity, sections });

const EOT_SHEDS = [
  {
    name: 'SHED-B',
    cranes: [
      crane('1', '30 Ton', BOTH_SIDES),
      crane('2', '30 Ton', BOTH_SIDES),
      crane('3', '20 Ton', SIDE_1),
      crane('4', '120 Ton', SIDE_1_AUX),
    ],
  },
  {
    name: 'SHED-C',
    cranes: [
      crane('1', '30 Ton', BOTH_SIDES),
      crane('2', '20 Ton', SIDE_1),
      crane('3', '70 Ton', SIDE_1_AUX),
    ],
  },
  {
    name: 'SHED-D',
    cranes: [
      crane('1', '20 Ton', SIDE_1),
      crane('2', '30 Ton', BOTH_SIDES),
    ],
  },
];

function findCrane(shedName, craneNumber) {
  const shed = EOT_SHEDS.find((s) => s.name === shedName);
  return shed?.cranes.find((c) => c.number === String(craneNumber)) || null;
}

/** Flat list: { itemKey: 'section.point', section, point } */
const EOT_ITEMS = EOT_SECTIONS.flatMap((section) =>
  section.points.map((p) => ({ itemKey: `${section.key}.${p.key}`, section, point: p }))
);

const ITEM_BY_KEY = new Map(EOT_ITEMS.map((it) => [it.itemKey, it]));

const itemsIn = (sectionKeys) =>
  (sectionKeys ? EOT_ITEMS.filter(({ section }) => sectionKeys.includes(section.key)) : EOT_ITEMS);

function nullIfEmpty(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** 'HH:MM' (or 'HH:MM:SS') → 'HH:MM', anything else → null */
function normalizeTime(v) {
  const m = String(v || '').trim().match(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/);
  return m ? `${m[1]}:${m[2]}` : null;
}

function isAlert(p, value) {
  return Boolean(value) && p.alertValues.includes(value);
}

function needsPhoto(p, value) {
  return isAlert(p, value) && p.action === REMARK_PHOTO;
}

/** Keeps only the given sections' points; drops values that are not a valid option. */
function normalizeChecklistItems(raw, sectionKeys) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  EOT_SECTIONS.filter((s) => !sectionKeys || sectionKeys.includes(s.key)).forEach((section) => {
    const srcSection = src[section.key] && typeof src[section.key] === 'object' ? src[section.key] : {};
    out[section.key] = {};
    section.points.forEach((p) => {
      const row = srcSection[p.key] || {};
      const value = nullIfEmpty(row.value);
      out[section.key][p.key] = {
        value: value && p.options.includes(value.toUpperCase()) ? value.toUpperCase() : null,
        remark: nullIfEmpty(row.remark),
      };
    });
  });
  return out;
}

function countAlerts(items) {
  if (!items || typeof items !== 'object') return 0;
  return EOT_ITEMS.filter(({ section, point: p }) => isAlert(p, items[section.key]?.[p.key]?.value)).length;
}

/**
 * Returns an error message for the first problem found, or null.
 * photoCounts: { [itemKey]: number } — photos attached to each point (kept + new).
 */
function findChecklistError(items, photoCounts = {}, sectionKeys) {
  for (const { itemKey, section, point: p } of itemsIn(sectionKeys)) {
    const row = items[section.key]?.[p.key] || {};
    const where = `${section.short} ${p.label}`;
    if (p.required && !row.value) return `${where} is required`;
    if (isAlert(p, row.value)) {
      if (!row.remark) return `Remark is required for ${where} (${row.value})`;
      if (p.action === REMARK_PHOTO && !(photoCounts[itemKey] > 0)) {
        return `Photo is required for ${where} (${row.value})`;
      }
    }
    if ((photoCounts[itemKey] || 0) > MAX_PHOTOS_PER_POINT) {
      return `Maximum ${MAX_PHOTOS_PER_POINT} photos allowed for ${where}`;
    }
  }
  return null;
}

module.exports = {
  EOT_DEPARTMENT_NAME,
  MAX_PHOTOS_PER_POINT,
  REMARK,
  REMARK_PHOTO,
  EOT_SECTIONS,
  EOT_SHEDS,
  findCrane,
  EOT_ITEMS,
  ITEM_BY_KEY,
  nullIfEmpty,
  normalizeTime,
  isAlert,
  needsPhoto,
  normalizeChecklistItems,
  countAlerts,
  findChecklistError,
};
