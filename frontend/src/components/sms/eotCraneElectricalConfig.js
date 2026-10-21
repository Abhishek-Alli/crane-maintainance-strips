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

export const isBadValue = (point, value) => Boolean(value) && value !== EOT_ELEC_OPTIONS[0];

export const craneOptionLabel = (shed, crane) => `${shed.name}, Crane : ${crane.number} - ${crane.capacity}`;

const pad = (n) => String(n).padStart(2, '0');
export const nowDateTimeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function emptyItems() {
  const items = {};
  EOT_ELEC_SECTIONS.forEach((s) => {
    items[s.key] = {};
    s.points.forEach((p) => {
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

/** Number of NOT OKAY points in the checked sections */
export function countNotOkay(items, skipped = []) {
  let n = 0;
  EOT_ELEC_SECTIONS.forEach((s) => {
    if (skipped.includes(s.key)) return;
    s.points.forEach((p) => {
      if (p.type === 'check' && isBadValue(p, items?.[s.key]?.[p.key]?.value)) n += 1;
    });
  });
  return n;
}

/** First missing compulsory entry in the checked sections, or '' */
export function firstIssue(items, skipped = []) {
  for (const s of EOT_ELEC_SECTIONS) {
    if (skipped.includes(s.key)) continue;
    for (const p of s.points) {
      const row = items?.[s.key]?.[p.key] || {};
      if (p.type === 'check') {
        if (!row.value) return `${s.short} — ${p.label}: select OKAY or NOT OKAY`;
      } else {
        const missing = EOT_ELEC_PHASES.find((ph) => row[ph.key] === '' || row[ph.key] === null || row[ph.key] === undefined);
        if (missing) return `${s.short} — ${p.label}: enter ${missing.label}`;
      }
    }
  }
  return '';
}
