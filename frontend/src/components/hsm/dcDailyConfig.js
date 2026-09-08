export const DC_CHECK_SECTIONS = [
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

/** Flat list of every fillable check, derived from DC_CHECK_SECTIONS (one per main point). */
export const DC_CHECK_ITEMS = DC_CHECK_SECTIONS.map((section) => ({
  key: section.key,
  label: section.label,
  sectionKey: section.key,
  sectionLabel: section.label,
}));

export function emptySectionValues() {
  const section_values = {};
  DC_CHECK_SECTIONS.forEach((section) => {
    (section.valueFields || []).forEach((field) => {
      section_values[`${section.key}_${field.key}`] = '';
    });
  });
  return section_values;
}

export function emptyDcDailyForm() {
  const checklist_items = {};
  DC_CHECK_ITEMS.forEach(({ key }) => {
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
