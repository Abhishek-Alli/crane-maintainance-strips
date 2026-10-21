/** SMS EOT Crane — Electrical maintenance check sheet — keep in sync with frontend/src/components/sms/eotCraneElectricalConfig.js */

const EOT_ELEC_OPTIONS = ['OKAY', 'NOT OKAY'];

const check = (key, label) => ({ key, label, type: 'check' });
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

const EOT_ELEC_SECTIONS = [
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

const PHASES = ['r', 'y', 'b'];
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const nullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** Returns a number, null for blank, or NaN for an invalid entry */
function parseNumber(v) {
  const s = nullIfEmpty(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Keeps only known sections that exist; returns the list of skipped section keys */
function normalizeSkipped(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return EOT_ELEC_SECTIONS.filter((s) => list.includes(s.key)).map((s) => s.key);
}

/** Returns { items } (only the checked sections) or { error } for a missing / invalid compulsory entry */
function normalizeItems(raw, skipped) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const section of EOT_ELEC_SECTIONS) {
    if (skipped.includes(section.key)) continue;
    out[section.key] = {};
    for (const p of section.points) {
      const row = src[section.key]?.[p.key] || {};
      const remark = nullIfEmpty(row.remark) || '';
      const where = `${section.short} — ${p.label}`;
      if (p.type === 'check') {
        const value = nullIfEmpty(row.value);
        if (!value || !EOT_ELEC_OPTIONS.includes(value)) return { error: `${where}: select OKAY or NOT OKAY` };
        out[section.key][p.key] = { value, remark };
      } else {
        const cur = { remark };
        for (const ph of PHASES) {
          const n = parseNumber(row[ph]);
          if (n === null || Number.isNaN(n)) return { error: `${where}: enter a number for ${ph.toUpperCase()}` };
          cur[ph] = n;
        }
        out[section.key][p.key] = cur;
      }
    }
  }
  return { items: out };
}

module.exports = {
  EOT_ELEC_OPTIONS, EOT_ELEC_SECTIONS, DATETIME, nullIfEmpty, normalizeSkipped, normalizeItems,
};
