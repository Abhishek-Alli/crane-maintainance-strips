export const FM_CHECK_ITEMS = [
  { key: 'entry_guide_gap', label: 'Entry guide gap should be checked before start rolling' },
  { key: 'exit_guide_gap', label: 'Exit guide gap should be checked before start rolling' },
  { key: 'exit_top_bottom_stripper', label: 'Exit top bottom stripper should be check' },
  { key: 'all_system_on', label: 'All system to be On' },
  { key: 'hp_pressure', label: 'HP pressure to be checked' },
  { key: 'lp_pressure', label: 'LP pressure to be checked' },
  { key: 'hgc_cylinder_pressure', label: 'HGC cylinder pressure to be checked' },
  { key: 'bending_balancing_pressure', label: 'Bending balancing pressure to be checked' },
  { key: 'roll_cooling_on', label: 'Roll cooling to be on' },
  { key: 'roll_gap_manual', label: 'Roll gap to checked manually' },
  { key: 'air_pressure', label: 'Air pressure to be checked' },
  { key: 'stand_axial_clamp', label: 'All stand axial clamp to be checked' },
  { key: 'stand_spindle_clamp', label: 'All stand spindle clamp to be checked' },
  { key: 'vertical_edger_gap', label: 'Vertical edger gap to be checked' },
  { key: 'looper_angle', label: 'Looper angle to be checked' },
  { key: 'entry_pinch_roll_gap', label: 'Entry pinch roll gap to be checked' },
  { key: 'blower', label: 'Blower to be checked' },
  { key: 'lubrication_system', label: 'Lubrication system to be checked' },
  { key: 'work_roll_chuck_nut_lock', label: 'All stand both work roll chuck nut and lock status' },
  { key: 'backup_roll_chuck_nut_lock', label: 'All stand both backup roll chuck nut and lock status' },
  { key: 'simulation_3_4_times', label: '3 to 4 times simulation to be done' },
];

export const FM_GUIDE_CENTERLINE_KEYS = [
  { key: 'DS', label: 'DS' },
  { key: 'E1', label: 'E1' },
  { key: 'F1', label: 'F1' },
  { key: 'F2', label: 'F2' },
  { key: 'F3', label: 'F3' },
  { key: 'F4', label: 'F4' },
  { key: 'F5', label: 'F5' },
  { key: 'F6', label: 'F6' },
  { key: 'F7', label: 'F7' },
  { key: 'F8', label: 'F8' },
  { key: 'all_looper', label: 'All Looper' },
];

export function emptyFmDailyForm() {
  const checklist_items = {};
  FM_CHECK_ITEMS.forEach(({ key }) => {
    checklist_items[key] = { status: '', remark: '' };
  });
  const guide_centerline = {};
  FM_GUIDE_CENTERLINE_KEYS.forEach(({ key }) => {
    guide_centerline[key] = '';
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
    guide_centerline,
    note: '',
  };
}

export function statusDisplay(s) {
  if (s === 'OK') return 'OK';
  if (s === 'NOT_OK') return 'NOT OK';
  return '—';
}
