/** Shared RM Daily Check List item definitions (backend) */

const STATUS_VALUES = ['OK', 'NOT_OK'];

const CHECK_SECTIONS = [
  {
    key: 'entry_guide_gap',
    label: 'Entry Guide Gap should be checked before start rolling'
  },
  {
    key: 'exit_guide_gap',
    label: 'Exit Guide Gap should be checked before start rolling'
  },
  {
    key: 'entry_top_bottom_stripper',
    label: 'Entry Top Bottom Stripper should be check',
  },
  {
    key: 'all_system_on',
    label: 'All System to be ON',
  },
  {
    key: 'hp_pressure',
    label: 'HP Pressure to be checked'
  },
  {
    key: 'lp_pressure',
    label: 'LP Pressure to be checked'
  },
  {
    key: 'roll_cooling_on',
    label: 'Roll Cooling to be ON'
  },
  {
    key: 'air_pressure',
    label: 'Air Pressure to be checked'
  },
  {
    key: 'rm_axial_clamp',
    label: 'RM Axial Clamp to be checked'
  },
  {
    key: 'rm_spindle_clamp',
    label: 'RM Spindle Clamp to be checked'
  },
  {
    key: 'roll_gap_manual',
    label: 'Roll Gap to checked manually'
  },
  {
    key: 'vertical_edger_gap',
    label: 'Vertical Edger Gap to be checked'
  },
  {
    key: 'pri_descaling_pressure',
    label: 'Pri. Descaling Pressure to be checked'
  },
  {
    key: 'rm_descaling_pressure',
    label: 'RM Descaling Pressure to be checked'
  },
  {
    key: 'blower',
    label: 'Blower to be checked'
  },
  {
    key: 'rm_transfer_bar_width_thickness',
    label: 'RM Transfer Bar Width & Thickness value as per FM requirement'
  },
  {
    key: 'lubrication_system',
    label: 'Lubrication System to be checked'
  },
  {
    key: 'rm_work_roll_chuck_nut_lock',
    label: 'RM Both Work Roll Chuck Nut and Lock status',
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
