/** Shared DC Daily Check List item definitions (backend) */

const STATUS_VALUES = ['OK', 'NOT_OK'];

const CHECK_SECTIONS = [
  {
    key: 'entry_guide_gap',
    label: 'Entry Guide Gap should be check before start rolling'
  },
  {
    key: 'pinch_roll_gap_1',
    label: 'Pinch Roll Gap should be check'
  },
  {
    key: 'mandrel_dia',
    label: 'Mandrel Dia to be check'
  },
  {
    key: 'mandrel_lvdt_feedback',
    label: 'Mandrel LVDT Feedback to be checked'
  },
  {
    key: 'wr_gap',
    label: 'All WR1, WR2 & WR3 Gap to be checked'
  },
  {
    key: 'all_system',
    label: 'All System to be checked',
  },
  {
    key: 'roll_cooling',
    label: 'All Roll Cooling to be ON'
  },
  {
    key: 'laminar_rot_roll',
    label: 'All Laminar Rot Roll to be checked',
  },
  {
    key: 'pinch_roll_gap_2',
    label: 'Pinch-Roll Gap should be checked'
  },
  {
    key: 'laminar_cross_spray',
    label: 'Laminar Cross Spray to be checked'
  },
  {
    key: 'air_pr',
    label: 'Air PR. to be checked'
  },
  {
    key: 'stripper_car_movement',
    label: 'Stripper Car Movement to be checked',
  },
  {
    key: 'lubrication_system',
    label: 'Lubrication System to be checked'
  },
  {
    key: 'hyd_pr',
    label: 'Hyd. PR. to be checked'
  },
  {
    key: 'blower',
    label: 'Blower to be checked'
  },
  {
    key: 'simulation_3_4_times',
    label: '3 to 4 times simulation to be done',
  },
];

const CHECK_ITEMS = CHECK_SECTIONS.map((section) => ({
  key: section.key,
  label: section.label,
  sectionKey: section.key,
  sectionLabel: section.label,
}));

function nullIfEmpty(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function normalizeStatus(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim().toUpperCase().replace(/\s+/g, '_');
  if (s === 'OK') return 'OK';
  if (s === 'NOT_OK' || s === 'NOTOK' || s === 'N_OK') return 'NOT_OK';
  return null;
}

function normalizeChecklistItems(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  CHECK_ITEMS.forEach(({ key }) => {
    const row = src[key] || {};
    out[key] = {
      status: normalizeStatus(row.status),
      remark: nullIfEmpty(row.remark),
      action_taken: nullIfEmpty(row.action_taken),
    };
  });
  return out;
}

/** Returns the sectionLabel of the first NOT_OK item missing an action_taken, or null. */
function findMissingActionTaken(normalizedItems) {
  const missing = CHECK_ITEMS.find(
    ({ key }) => normalizedItems[key]?.status === 'NOT_OK' && !normalizedItems[key]?.action_taken
  );
  return missing ? missing.sectionLabel : null;
}

function normalizeSectionValues(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  CHECK_SECTIONS.forEach((section) => {
    (section.valueFields || []).forEach((field) => {
      const key = `${section.key}_${field.key}`;
      out[key] = nullIfEmpty(src[key]);
    });
  });
  return out;
}

module.exports = {
  STATUS_VALUES,
  CHECK_SECTIONS,
  CHECK_ITEMS,
  nullIfEmpty,
  normalizeStatus,
  normalizeChecklistItems,
  normalizeSectionValues,
  findMissingActionTaken,
};
