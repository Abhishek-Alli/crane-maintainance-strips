/** SMS EOT Crane — Electrical maintenance check sheet — keep in sync with backend/utils/smsEotCraneElectricalConfig.js */

export { EOT_SHEDS, findCrane } from './eotCraneConfig';

export const EOT_ELEC_OPTIONS = ['OKAY', 'NOT OKAY'];

export const EOT_ELEC_PHASES = [
  { key: 'r', label: 'R' },
  { key: 'y', label: 'Y' },
  { key: 'b', label: 'B' },
];

const check = (key, label) => ({ key, label, type: 'check', options: EOT_ELEC_OPTIONS });
const current = (key, label) => ({ key, label, type: 'current' });

const hoistPoints = (tag) => [
  check('panel', `${tag} Panel`),
  check('resistance_box', `${tag} Resistance Box`),
  check('panel_contactor', `${tag} Panel Contactor`),
  check('rotary_limit_switch', `${tag} Rotary Limit Switch`),
  check('weight_limit_switch', `${tag} Weight Limit Switch`),
  check('motor_thyristor_oil', `${tag} Motor Thyristor & Oil`),
  current('motor_current', `${tag} Motor Current`),
  check('motor_carbon_brush', `${tag} Motor Carbon Brush`),
];

const motorPoints = (key, label) => [
  check(`${key}_thyristor_oil`, `${label} Thyristor & Oil`),
  current(`${key}_current`, `${label} Current`),
  check(`${key}_carbon_brush`, `${label} Carbon Brush`),
];

const travelPoints = (tag, motorLabel) => [
  check('panel', `${tag} Panel`),
  check('resistance_box', `${tag} Resistance Box`),
  check('panel_contactor', `${tag} Panel Contactor`),
  ...motorPoints('motor', motorLabel),
];

export const EOT_ELEC_SECTIONS = [
  {
    key: 'control_cabin', label: 'Control Cabin', short: 'Control Cabin',
    points: [
      check('protective_panel', 'Protective Panel Condition'),
      check('master_controller', 'Master Controller Condition (MH/ LT/ CT)'),
      check('dsl_power_collector', 'DSL Power Collector Condition'),
    ],
  },
  { key: 'main_hoist_1', label: 'Main Hoist 1', short: 'MH-1', points: hoistPoints('MH-1') },
  { key: 'main_hoist_2', label: 'Main Hoist 2', short: 'MH-2', points: hoistPoints('MH-2') },
  {
    key: 'long_travel', label: 'Long Travel', short: 'LT',
    points: [
      check('panel', 'LT Panel'),
      check('resistance_box', 'LT Resistance Box'),
      check('panel_contactor', 'LT Panel Contactor'),
      ...motorPoints('motor_1', 'LT Motor-1'),
      ...motorPoints('motor_2', 'LT Motor-2'),
    ],
  },
  { key: 'cross_travel_1', label: 'Cross Travel 1', short: 'CT-1', points: travelPoints('CT-1', 'CT-1 Motor-1') },
  { key: 'cross_travel_2', label: 'Cross Travel 2', short: 'CT-2', points: travelPoints('CT-2', 'CT-2 Motor') },
  { key: 'aux_hoist', label: 'Auxiliary Hoist', short: 'AH', points: hoistPoints('AH'), defaultSkipped: true },
];

/** Extra points that only some cranes have */
const EXTRA_POINTS = {
  long_travel: [
    { when: (sp) => sp.ltCount > 2, points: [...motorPoints('motor_3', 'LT Motor-3'), ...motorPoints('motor_4', 'LT Motor-4')] },
  ],
  cross_travel_1: [
    { when: (sp) => sp.ctMotors === 2, points: motorPoints('motor_2', 'CT-1 Motor-2') },
  ],
};

/**
 * Per-crane layout and max current (A) from the electrical limits sheet.
 * mh / ct / lt: max current per motor in order; ctMotors 2 = both CT motors belong to CT-1; aux: max current (omit = no limit)
 */
function buildSpec({ mh, ct, lt, aux, hasAux = aux !== undefined, ctMotors = 1 }) {
  const sections = ['control_cabin', 'main_hoist_1'];
  if (mh.length > 1) sections.push('main_hoist_2');
  sections.push('long_travel', 'cross_travel_1');
  if (ctMotors === 1 && ct.length > 1) sections.push('cross_travel_2');
  if (hasAux) sections.push('aux_hoist');

  const limits = {};
  mh.forEach((v, i) => { limits[`main_hoist_${i + 1}.motor_current`] = v; });
  lt.forEach((v, i) => { limits[`long_travel.motor_${i + 1}_current`] = v; });
  if (ctMotors === 2) {
    limits['cross_travel_1.motor_current'] = ct[0];
    limits['cross_travel_1.motor_2_current'] = ct[1];
  } else {
    ct.forEach((v, i) => { limits[`cross_travel_${i + 1}.motor_current`] = v; });
  }
  if (aux !== undefined) limits['aux_hoist.motor_current'] = aux;
  return { sections, limits, ltCount: lt.length, ctMotors };
}

const CRANE_SPECS = {
  'SHED-B|1': buildSpec({ mh: [134, 134], ct: [10.4, 10.4], lt: [25, 25] }),
  'SHED-B|2': buildSpec({ mh: [141, 141], ct: [10.4, 10.4], lt: [25, 25] }),
  'SHED-B|3': buildSpec({ mh: [141], ct: [10.6], lt: [19, 19] }),
  'SHED-B|4': buildSpec({ mh: [344], aux: 158, ct: [15.6, 15.6], ctMotors: 2, lt: [29, 29, 29, 29] }),
  'SHED-C|1': buildSpec({ mh: [141, 141], ct: [10, 10], lt: [19, 19] }),
  'SHED-C|2': buildSpec({ mh: [141], ct: [10], lt: [15.6, 15.6] }),
  'SHED-C|3': buildSpec({ mh: [204], ct: [20], lt: [35, 35], hasAux: true }),
  'SHED-D|1': buildSpec({ mh: [141], ct: [10], lt: [15.6, 15.6] }),
  'SHED-D|2': buildSpec({ mh: [141, 141], ct: [10.4, 10.4], lt: [19, 19] }),
};

/** Sections (with points and current limits) that apply to one crane; [] until a crane is chosen */
export function getSections(shed, number) {
  const spec = CRANE_SPECS[`${shed}|${number}`];
  if (!spec) return [];
  return EOT_ELEC_SECTIONS.filter((s) => spec.sections.includes(s.key)).map((s) => {
    const extra = (EXTRA_POINTS[s.key] || []).filter((e) => e.when(spec)).flatMap((e) => e.points);
    const points = [...s.points, ...extra].map((p) => (
      p.type === 'current' ? { ...p, limit: spec.limits[`${s.key}.${p.key}`] ?? null } : p
    ));
    return { ...s, points };
  });
}

export const isBadValue = (point, value) => Boolean(value) && value !== EOT_ELEC_OPTIONS[0];

/** Any phase of a current row above the point's max current */
export const isCurrentOver = (point, row) =>
  point.limit != null && EOT_ELEC_PHASES.some((ph) => row?.[ph.key] !== '' && row?.[ph.key] != null && Number(row[ph.key]) > point.limit);

export const craneOptionLabel = (shed, crane) => `${shed.name}, Crane : ${crane.number} - ${crane.capacity}`;

const pad = (n) => String(n).padStart(2, '0');
export const nowDateTimeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Empty entries for every point any crane can have */
export function emptyItems() {
  const items = {};
  EOT_ELEC_SECTIONS.forEach((s) => {
    items[s.key] = {};
    const extra = (EXTRA_POINTS[s.key] || []).flatMap((e) => e.points);
    [...s.points, ...extra].forEach((p) => {
      items[s.key][p.key] = p.type === 'check' ? { value: '', remark: '' } : { r: '', y: '', b: '', remark: '' };
    });
  });
  return items;
}

export function emptyEotCraneElectricalForm() {
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    shed_name: '',
    crane_number: '',
    items: emptyItems(),
    skipped_sections: EOT_ELEC_SECTIONS.filter((s) => s.defaultSkipped).map((s) => s.key),
    remark: '',
    maintenance_start: '',
    maintenance_end: '',
  };
}

/** Number of NOT OKAY points in the checked sections of a crane */
export function countNotOkay(items, skipped = [], shed, number) {
  let n = 0;
  getSections(shed, number).forEach((s) => {
    if (skipped.includes(s.key)) return;
    s.points.forEach((p) => {
      if (p.type === 'check' && isBadValue(p, items?.[s.key]?.[p.key]?.value)) n += 1;
    });
  });
  return n;
}

/** First missing compulsory entry in the checked sections, or '' */
export function firstIssue(items, skipped = [], shed, number) {
  for (const s of getSections(shed, number)) {
    if (skipped.includes(s.key)) continue;
    for (const p of s.points) {
      const row = items?.[s.key]?.[p.key] || {};
      if (p.type === 'check') {
        if (!row.value) return `${s.short} — ${p.label}: select OKAY or NOT OKAY`;
      } else {
        const missing = EOT_ELEC_PHASES.find((ph) => row[ph.key] === '' || row[ph.key] === null || row[ph.key] === undefined);
        if (missing) return `${s.short} — ${p.label}: enter ${missing.label}`;
        if (isCurrentOver(p, row) && !String(row.remark || '').trim()) {
          return `${s.short} — ${p.label}: remark is required when current is above ${p.limit}`;
        }
      }
    }
  }
  return '';
}
