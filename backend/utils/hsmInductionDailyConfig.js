/** Shared Induction Daily Check List item definitions (backend) */

const STATUS_VALUES = ['OK', 'NOT_OK'];

const CHECK_ITEMS = [
  { key: 'induction_guidesetting', label: 'Induction Guidesetting' },
  { key: 'entry_main_guide_gap', label: 'Entry Main Guide Gap' },
  { key: 'exit_main_guide_gap', label: 'Exit Main Guide Gap' },
  { key: 'ind_all_guide_gap', label: 'IND. All Guide Gap' },
  { key: 'pinch_roll_gap', label: 'Pinch-Roll Gap should be checked' },
  { key: 'all_roller_table_check', label: 'All Roller Table To Check' },
  { key: 'ind_approach_roller_table', label: 'IND. Approach Roller Table' },
  { key: 'ind_roller_table', label: 'IND. Roller Table' },
  { key: 'caster_1_rot', label: 'Caster-1 Rot' },
  { key: 'caster_2_rot', label: 'Caster-2 Rot' },
  { key: 'rhf_rot', label: 'RHF Rot' },
  { key: 'caster_reject_line', label: 'Caster Reject Line' },
  { key: 'all_heater', label: 'All Heater to be checked' },
  { key: 'refractory', label: 'Refractory to be checked' },
  { key: 'coil_cooling_rail', label: 'Coil Cooling Rail to be checked' },
  { key: 'scale_cleaning', label: 'Scale Cleaning to be checked' },
  { key: 'water_pressure', label: 'Water Pressure to be checked' },
  { key: 'dm_water_tank_level', label: 'All DM Water Tank Level check' },
  { key: 'icw_water_pr_temp', label: 'ICW Water Pr./Temp to be checked' },
  { key: 'all_psu', label: 'All PSU to be checked' },
  { key: 'all_psu_temp', label: 'All PSU Temp. to be checked' },
  { key: 'air_pr', label: 'Air PR. to be checked' },
  { key: 'hmd_working', label: 'HMD Working to be checked' },
  { key: 'pyrometer', label: 'Pyrometer to be checked' },
  { key: 'simulation_3_4_times', label: '3 to 4 times simulation to be done' },
];

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

/** Returns the label of the first NOT_OK item missing an action_taken, or null. */
function findMissingActionTaken(normalizedItems) {
  const missing = CHECK_ITEMS.find(
    ({ key }) => normalizedItems[key]?.status === 'NOT_OK' && !normalizedItems[key]?.action_taken
  );
  return missing ? missing.label : null;
}

function normalizeSectionValues(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  CHECK_ITEMS.forEach((item) => {
    (item.valueFields || []).forEach((field) => {
      const key = `${item.key}_${field.key}`;
      out[key] = nullIfEmpty(src[key]);
    });
  });
  return out;
}

module.exports = {
  STATUS_VALUES,
  CHECK_ITEMS,
  nullIfEmpty,
  normalizeStatus,
  normalizeChecklistItems,
  normalizeSectionValues,
  findMissingActionTaken,
};
