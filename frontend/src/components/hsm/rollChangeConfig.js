export const SHIFTS = ['A', 'B', 'C'];

export const AREAS = [
  'Induction Heater',
  'Roughing Mill',
  'Finishing Mill',
  'Down Coiler',
];

/** Equipment options per area. `isOther` requires a manual name. */
export const EQUIPMENT_BY_AREA = {
  'Induction Heater': [
    { key: 'DM', label: 'DM' },
    { key: 'Guide', label: 'Guide' },
    { key: 'Coil', label: 'Coil' },
    { key: 'Scale', label: 'Scale' },
    { key: 'Other', label: 'Other', isOther: true },
  ],
  'Roughing Mill': [
    { key: 'ROT', label: 'ROT' },
    { key: 'Scale', label: 'Scale' },
    { key: 'Carden shaft', label: 'Carden shaft' },
    { key: 'Manual Guide', label: 'Manual Guide' },
    { key: 'Appron Plate', label: 'Appron Plate' },
    { key: 'Other', label: 'Other', isOther: true },
  ],
  'Finishing Mill': [
    { key: 'QRC', label: 'QRC' },
    { key: 'Roll', label: 'Roll' },
    { key: 'Cardan Shaft', label: 'Cardan Shaft' },
    { key: 'Looper', label: 'Looper' },
    { key: 'Discaller', label: 'Discaller' },
    { key: 'Other', label: 'Other', isOther: true },
  ],
  'Down Coiler': [
    { key: 'Motor Base', label: 'Motor Base' },
    { key: 'Greasing', label: 'Greasing' },
    { key: 'Hose Pipe', label: 'Hose Pipe' },
    { key: 'Wrapper Roll', label: 'Wrapper Roll' },
    { key: 'Pinch Roll', label: 'Pinch Roll' },
    { key: 'Mandrel', label: 'Mandrel' },
    { key: 'Coil Car', label: 'Coil Car' },
    { key: 'Other', label: 'Other', isOther: true },
  ],
};

export function equipmentOptionsForArea(area) {
  return EQUIPMENT_BY_AREA[area] || [];
}

export function isOtherEquipment(area, equipmentKey) {
  const opt = equipmentOptionsForArea(area).find((o) => o.key === equipmentKey);
  return Boolean(opt?.isOther);
}

export function displayEquipmentName(entry) {
  if (!entry) return '—';
  if (entry.equipment_key === 'Other' || entry.custom_name) {
    return entry.custom_name?.trim() || entry.equipment_label || 'Other';
  }
  return entry.equipment_label || entry.equipment_key || '—';
}
