export const RM_CHECK_SECTIONS = [
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

/** Flat list of every fillable check, derived from RM_CHECK_SECTIONS (one per main point). */
export const RM_CHECK_ITEMS = RM_CHECK_SECTIONS.map((section) => ({
  key: section.key,
  label: section.label,
  sectionKey: section.key,
  sectionLabel: section.label,
}));

export function emptySectionValues() {
  const section_values = {};
  RM_CHECK_SECTIONS.forEach((section) => {
    (section.valueFields || []).forEach((field) => {
      section_values[`${section.key}_${field.key}`] = '';
    });
  });
  return section_values;
}

export function emptyRmDailyForm() {
  const checklist_items = {};
  RM_CHECK_ITEMS.forEach(({ key }) => {
    checklist_items[key] = { status: '', remark: '', action_taken: '' };
  });
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return {
    report_date: `${yyyy}-${mm}-${dd}`,
    shift: 'A',
    shift_engineer: '',
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
