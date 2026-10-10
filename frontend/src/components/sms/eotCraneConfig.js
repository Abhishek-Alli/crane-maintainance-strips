/** SMS EOT Crane Maintenance (Mechanical) checklist — keep in sync with backend/utils/smsEotCraneConfig.js */

export const MAX_PHOTOS_PER_POINT = 3;

export const REMARK = 'REMARK';
export const REMARK_PHOTO = 'REMARK_PHOTO';

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

export const EOT_SECTIONS = [
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

export const EOT_SHEDS = [
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

export function findCrane(shedName, craneNumber) {
  const shed = EOT_SHEDS.find((s) => s.name === shedName);
  return shed?.cranes.find((c) => c.number === String(craneNumber)) || null;
}

export function craneLabel(number, capacity) {
  return `Crane ${number || '—'}${capacity ? ` (${capacity})` : ''}`;
}

/** Flat list: { itemKey: 'section.point', section, point } */
export const EOT_ITEMS = EOT_SECTIONS.flatMap((section) =>
  section.points.map((p) => ({ itemKey: `${section.key}.${p.key}`, section, point: p }))
);

const itemsIn = (sectionKeys) =>
  (sectionKeys ? EOT_ITEMS.filter(({ section }) => sectionKeys.includes(section.key)) : EOT_ITEMS);

export function isAlert(p, value) {
  return Boolean(value) && p.alertValues.includes(value);
}

export function needsPhoto(p, value) {
  return isAlert(p, value) && p.action === REMARK_PHOTO;
}

export function actionLabel(p) {
  return 'Remark';
}

export function emptyChecklistItems() {
  const out = {};
  EOT_SECTIONS.forEach((section) => {
    out[section.key] = {};
    section.points.forEach((p) => {
      out[section.key][p.key] = { value: '', remark: '' };
    });
  });
  return out;
}

/** sectionKeys limits the count to the checked sections (all sections when omitted) */
export function countAlerts(items, sectionKeys) {
  if (!items || typeof items !== 'object') return 0;
  return itemsIn(sectionKeys).filter(({ section, point: p }) => isAlert(p, items[section.key]?.[p.key]?.value)).length;
}

/** Every missing compulsory entry: [{ itemKey, where, message }]. photoCounts: { [itemKey]: number } */
export function listChecklistIssues(items, photoCounts = {}, sectionKeys) {
  const issues = [];
  itemsIn(sectionKeys).forEach(({ itemKey, section, point: p }) => {
    const row = items[section.key]?.[p.key] || {};
    const where = `${section.short} ${p.label}`;
    const add = (message) => issues.push({ itemKey, where, message });
    if (p.required && !row.value) add('Select a value');
    if (isAlert(p, row.value)) {
      if (!String(row.remark || '').trim()) add(`Remark required (${row.value})`);
    }
    if ((photoCounts[itemKey] || 0) > MAX_PHOTOS_PER_POINT) add(`Maximum ${MAX_PHOTOS_PER_POINT} photos`);
  });
  return issues;
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function emptyEotForm() {
  return {
    report_date: todayISO(),
    recorded_by: '',
    shed_name: '',
    crane_number: '',
    checklist_items: emptyChecklistItems(),
    skipped_sections: [],
    general_remark: '',
    maintenance_start_time: '',
    maintenance_stop_time: '',
  };
}

/** 'done' | 'missed' | 'pending' for a schedule row from the API */
export function scheduleStatus(s) {
  if (s.log_id) return 'done';
  return String(s.planned_date).slice(0, 10) < todayISO() ? 'missed' : 'pending';
}

export const SCHEDULE_STATUS_STYLE = {
  done: { label: 'Done', chip: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  pending: { label: 'Pending', chip: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  missed: { label: 'Missed', chip: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
};

export const formatDate = (d) => {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatTime = (t) => (t ? String(t).slice(0, 5) : '—');
