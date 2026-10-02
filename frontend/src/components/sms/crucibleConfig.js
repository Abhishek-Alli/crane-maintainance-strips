/** SMS Crucible Maintenance check sheet — keep in sync with backend/utils/smsCrucibleConfig.js */
import { todayISO } from './eotCraneConfig';

export const CRUCIBLE_FURNACES = ['26 MW'];
export const CRUCIBLE_NUMBERS = ['1', '2'];

export const MAX_PHOTOS_PER_POINT = 3;

export const REMARK = 'REMARK';
export const REMARK_PHOTO = 'REMARK_PHOTO';

const OKAY_NOT_OKAY = ['OKAY', 'NOT OKAY'];
const DONE_NOT_DONE = ['DONE', 'NOT DONE'];

const point = (key, label, options, alertValues, action = REMARK) => ({
  key, label, options, alertValues, action,
});

const condition = (key, label, action) => point(key, label, OKAY_NOT_OKAY, ['NOT OKAY'], action);
const greasing = (key, label) => point(key, label, DONE_NOT_DONE, ['NOT DONE']);

export const CRUCIBLE_POINTS = [
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
  return Object.fromEntries(CRUCIBLE_POINTS.map((p) => [p.key, { value: '', remark: '' }]));
}

export function countAlerts(items) {
  if (!items || typeof items !== 'object') return 0;
  return CRUCIBLE_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/** Every missing compulsory check point entry: [{ key, where, message }]. photoCounts: { [key]: number } */
export function listChecklistIssues(items, photoCounts = {}) {
  const issues = [];
  CRUCIBLE_POINTS.forEach((p) => {
    const row = items[p.key] || {};
    const add = (message) => issues.push({ key: p.key, where: p.label, message });
    if (!row.value) add('Select a value');
    if (isAlert(p, row.value)) {
      if (!String(row.remark || '').trim()) add(`Remark required (${row.value})`);
      if (p.action === REMARK_PHOTO && !(photoCounts[p.key] > 0)) add(`Photo required (${row.value})`);
    }
    if ((photoCounts[p.key] || 0) > MAX_PHOTOS_PER_POINT) add(`Maximum ${MAX_PHOTOS_PER_POINT} photos`);
  });
  return issues;
}

export function emptyCrucibleForm() {
  return {
    report_date: todayISO(),
    recorded_by: '',
    furnace: CRUCIBLE_FURNACES[0],
    crucible: '',
    checklist_items: emptyChecklistItems(),
    maintenance_start_at: '',
    maintenance_stop_at: '',
  };
}

/** 'YYYY-MM-DDTHH:MM' → '28 Sep 2026, 14:30' */
export function formatDateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${String(v).slice(11, 16)}`;
}

/** Minutes between two 'YYYY-MM-DDTHH:MM' values → '2h 15m' ('' when not valid) */
export function durationLabel(start, stop) {
  if (!start || !stop) return '';
  const mins = Math.round((new Date(stop) - new Date(start)) / 60000);
  if (!Number.isFinite(mins) || mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
