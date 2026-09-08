export const INDUCTION_CHECK_ITEMS = [
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

export function emptySectionValues() {
  const section_values = {};
  INDUCTION_CHECK_ITEMS.forEach((item) => {
    (item.valueFields || []).forEach((field) => {
      section_values[`${item.key}_${field.key}`] = '';
    });
  });
  return section_values;
}

export function emptyInductionDailyForm() {
  const checklist_items = {};
  INDUCTION_CHECK_ITEMS.forEach(({ key }) => {
    checklist_items[key] = { status: '', remark: '', action_taken: '' };
  });
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return {
    report_date: `${yyyy}-${mm}-${dd}`,
    shift: 'A',
    operator_name: '',
    checklist_items,
    section_values: emptySectionValues(),
    note: '',
  };
}

export function statusDisplay(s) {
  if (s === 'OK') return 'OK';
  if (s === 'NOT_OK') return 'NOT OK';
  return '—';
}
