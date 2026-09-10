/** Shared FM Daily Check List item definitions (backend) */

const STATUS_VALUES = ['OK', 'NOT_OK'];

const CHECK_SECTIONS = [
  {
    key: 'entry_guide_gap',
    label: 'Entry guide gap should be checked before start rolling'
  },
  {
    key: 'exit_guide_gap',
    label: 'Exit guide gap should be checked before start rolling'
  },
  {
    key: 'exit_top_bottom_stripper',
    label: 'Exit top/bottom stripper should be check',
  },
  {
    key: 'all_system_on',
    label: 'All system to be On',
  },
  {
    key: 'hp_pressure',
    label: 'HP pressure to be checked'
  },
  {
    key: 'lp_pressure',
    label: 'LP pressure to be checked'
  },
  {
    key: 'hgc_cylinder_pressure',
    label: 'HGC cylinder pressure to be checked'
  },
  {
    key: 'bending_balancing_pressure',
    label: 'Bending balancing pressure to be checked'
  },
  {
    key: 'roll_cooling_on',
    label: 'Roll cooling to be on'
  },
  {
    key: 'roll_gap_manual',
    label: 'Roll gap to checked manually'
  },
  {
    key: 'air_pressure',
    label: 'Air pressure to be checked'
  },
  {
    key: 'stand_axial_clamp',
    label: 'All stand axial clamp to be checked'
  },
  {
    key: 'stand_spindle_clamp',
    label: 'All stand spindle clamp to be checked'
  },
  {
    key: 'vertical_edger_gap',
    label: 'Vertical edger gap to be checked'
  },
  {
    key: 'looper_angle',
    label: 'Looper angle to be checked'
  },
  {
    key: 'entry_pinch_roll_gap',
    label: 'Entry pinch roll gap to be checked'
  },
  {
    key: 'blower',
    label: 'Blower to be checked'
  },
  {
    key: 'lubrication_system',
    label: 'Lubrication system to be checked'
  },
  {
    key: 'work_roll_chuck_nut_lock',
    label: 'All stand both work roll chuck nut and lock status',
  },
  {
    key: 'backup_roll_chuck_nut_lock',
    label: 'All stand both backup roll chuck nut and lock status',
  },
  {
    key: 'simulation_3_4_times',
    label: '3 to 4 times simulation to be done',
  },
  {
    key: 'exit_guide_inside_entry_guide',
    label: 'All exit side guides must be inside entry side guides',
  },
  {
    key: 'entry_guide_gap_removal',
    label: 'All entry side guides top and bottom gaps must be removed with welding, grinding and proper centerline setting',
  },
  {
    key: 'looper_fingers_check',
    label: 'All looper fingers check',
  },
  {
    key: 'looper_levels_check',
    label: 'All looper levels to be check',
  },
  {
    key: 'guide_water_spray',
    label: 'Water must be sprayed in entry/exit guides for scale removal every hour',
  },
  {
    key: 'spare_guide_ready',
    label: '1 spare guide for all stands to be kept ready for change if required',
  },
  {
    key: 'drum_shear_calibration',
    label: 'Drum shear calibration to be checked',
  },
  {
    key: 'xray_width_gauge_calibration',
    label: 'X-ray & width gauge must be calibration in roll change',
  },
  {
    key: 'rm_fm_work_rolls_packing_remove',
    label: 'RM & FM work rolls packing to be check for remove',
  },
  {
    key: 'rm_dc_calibration_roll_change',
    label: 'RM & DC calibration to be check in roll change',
  },
];

const CHECK_ITEMS = CHECK_SECTIONS.map((section) => ({
  key: section.key,
  label: section.label,
  sectionKey: section.key,
  sectionLabel: section.label,
}));

const GUIDE_CENTERLINE_KEYS = [
  { key: 'pinch_roll', label: 'Pinch Roll' },
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

function normalizeGuideCenterline(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  GUIDE_CENTERLINE_KEYS.forEach(({ key }) => {
    out[key] = nullIfEmpty(src[key]);
  });
  return out;
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
  GUIDE_CENTERLINE_KEYS,
  nullIfEmpty,
  normalizeStatus,
  normalizeChecklistItems,
  normalizeGuideCenterline,
  normalizeSectionValues,
  findMissingActionTaken,
};
