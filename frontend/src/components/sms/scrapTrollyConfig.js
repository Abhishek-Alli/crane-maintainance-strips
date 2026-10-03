/** SMS Scrap Transfer Trolly check sheet — keep in sync with backend/utils/smsScrapTrollyConfig.js */
import { todayISO } from './eotCraneConfig';

export const SCRAP_TROLLIES = ['1', '2'];

export const MAX_PHOTOS_PER_POINT = 3;

export const REMARK = 'REMARK';
export const REMARK_PHOTO = 'REMARK_PHOTO';

export const SCRAP_TROLLY_SECTIONS = [
  { key: 'gear_box', label: 'Gear Box' },
  { key: 'hydraulic', label: 'Hydraulic Power Pack' },
];

const point = (section, key, label, options, alertValues, action) => ({
  section, key, label, options, alertValues, action,
});

export const SCRAP_TROLLY_POINTS = [
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

export const sectionPoints = (sectionKey) => SCRAP_TROLLY_POINTS.filter((p) => p.section === sectionKey);

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
  return Object.fromEntries(SCRAP_TROLLY_POINTS.map((p) => [p.key, { value: '', remark: '' }]));
}

export function countAlerts(items) {
  if (!items || typeof items !== 'object') return 0;
  return SCRAP_TROLLY_POINTS.filter((p) => isAlert(p, items[p.key]?.value)).length;
}

/** Every missing compulsory check point entry: [{ key, where, message }]. photoCounts: { [key]: number } */
export function listChecklistIssues(items, photoCounts = {}) {
  const issues = [];
  SCRAP_TROLLY_POINTS.forEach((p) => {
    const row = items[p.key] || {};
    const add = (message) => issues.push({ key: p.key, where: p.label, message });
    if (!row.value) add('Select a value');
    if (isAlert(p, row.value)) {
      if (!String(row.remark || '').trim()) add(`Remark required (${row.value})`);
    }
    if ((photoCounts[p.key] || 0) > MAX_PHOTOS_PER_POINT) add(`Maximum ${MAX_PHOTOS_PER_POINT} photos`);
  });
  return issues;
}

export function emptyScrapTrollyForm() {
  return {
    report_date: todayISO(),
    recorded_by: '',
    trolly: '',
    checklist_items: emptyChecklistItems(),
  };
}
