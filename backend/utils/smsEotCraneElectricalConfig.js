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

/** Extra points that only some cranes have */
const EXTRA_POINTS = {
  long_travel: [
    { when: (s) => s.ltCount > 2, points: [...motorPoints('motor_3', 'LT Motor-3'), ...motorPoints('motor_4', 'LT Motor-4')] },
  ],
  cross_travel_1: [
    { when: (s) => s.ctMotors === 2, points: motorPoints('motor_2', 'CT-1 Motor-2') },
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
  'SHED-C|3': buildSpec({ mh: [204], ct: [20], lt: [35, 35] }),
  'SHED-D|1': buildSpec({ mh: [141], ct: [10], lt: [15.6, 15.6] }),
  'SHED-D|2': buildSpec({ mh: [141, 141], ct: [10.4, 10.4], lt: [19, 19] }),
};

/** Sections (with points and current limits) that apply to one crane; [] for an unknown crane */
function getSections(shed, number) {
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

/** Keeps only the skipped sections that apply to this crane */
function normalizeSkipped(raw, sections) {
  const list = Array.isArray(raw) ? raw : [];
  return sections.filter((s) => list.includes(s.key)).map((s) => s.key);
}

/** Returns { items } (only the checked sections) or { error } for a missing / invalid compulsory entry */
function normalizeItems(raw, skipped, sections) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const section of sections) {
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
        if (p.limit != null && PHASES.some((ph) => cur[ph] > p.limit) && !remark) {
          return { error: `${where}: remark is required when current is above ${p.limit}` };
        }
        out[section.key][p.key] = cur;
      }
    }
  }
  return { items: out };
}

module.exports = {
  EOT_ELEC_OPTIONS, EOT_ELEC_SECTIONS, DATETIME, getSections, nullIfEmpty, normalizeSkipped, normalizeItems,
};
