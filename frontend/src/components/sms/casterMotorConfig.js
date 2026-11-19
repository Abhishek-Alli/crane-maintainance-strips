/** SMS Billet/Slab Caster motor-current sheets — keep in sync with backend/utils/smsCasterMotorConfig.js */

const BILLET_STRAND_1_MOTORS = [
  { key: 'entry_top', label: 'Entry Top Motor', hp: 5, max: 8.2 },
  { key: 'entry_bottom', label: 'Entry Bottom Motor', hp: 5, max: 8.2 },
  { key: 'withdrawal', label: 'Withdrawal (Exit) Motor', hp: 5, max: 8.2 },
  { key: 'cart', label: 'Cart Motor', hp: 5, max: 7.8 },
  { key: 'drt_1', label: 'DRT Motor-1', hp: 5, max: 7.8 },
  { key: 'drt_2', label: 'DRT Motor-2', hp: 5, max: 7.8 },
  { key: 'mould_oscillation', label: 'Mould Oscillation Motor', hp: 15, max: 21 },
  { key: 'rdbs', label: 'RDBS Motor', hp: 5, max: 8.2 },
  { key: 'steam_exhaust_1', label: 'Steam Exhaust Motor-1', hp: 20, max: 20 },
  { key: 'hydraulic_1', label: 'Hydraulic Motor-1', hp: 30, max: 39.8 },
  { key: 'hydraulic_2', label: 'Hydraulic Motor-2', hp: 30, max: 39.8 },
  { key: 'hydraulic_3', label: 'Hydraulic Motor-3', hp: 30, max: 39.8 },
  { key: 'shearing_main_pump', label: 'Shearing Main Pump Motor', hp: 60, max: 81.5 },
  { key: 'shearing_lt', label: 'Shearing (LT) Motor', hp: 5, max: 7.5 },
  { key: 'shearing_oil_cooling', label: 'Shearing Oil Cooling Motor', hp: 2, max: 3.47 },
];

/** Strand 2 has the same motors as Strand 1 except steam exhaust and the hydraulic motors */
const STRAND_2_EXCLUDED = ['steam_exhaust_1', 'hydraulic_1', 'hydraulic_2', 'hydraulic_3'];
const BILLET_STRAND_2_MOTORS = BILLET_STRAND_1_MOTORS.filter((m) => !STRAND_2_EXCLUDED.includes(m.key));

const SLAB_STRAND_1_MOTORS = [
  { key: 'entry_top', label: 'Entry Top Motor', hp: 7.5, max: 12.6 },
  { key: 'entry_bottom', label: 'Entry Bottom Motor', hp: 7.5, max: 12.6 },
  { key: 'tangent', label: 'Tangent Motor', hp: 7.5, max: 12.6 },
  { key: 'withdrawal', label: 'Withdrawal (Exit) Motor', hp: 7.5, max: 12.6 },
  { key: 'cart', label: 'Cart Motor', hp: 3, max: 5 },
  { key: 'drt_1', label: 'DRT-1 Motor', hp: 3, max: 5 },
  { key: 'drt_2', label: 'DRT-2 Motor', hp: 3, max: 5 },
  { key: 'mould_oscillation', label: 'Mould Oscillation Motor', hp: 15, max: 21 },
  { key: 'rdbs', label: 'RDBS Motor', hp: 7.5, max: 12.6 },
  { key: 'steam_exhaust_1', label: 'Steam Exhaust Motor-1', hp: 20, max: 28.5 },
  { key: 'tilting_stand', label: 'Tilting Stand Motor', hp: 5, max: 7.8 },
];

/** Slab Strand 2 is the same as Strand 1 without the tilting stand motor */
const SLAB_STRAND_2_MOTORS = SLAB_STRAND_1_MOTORS.filter((m) => m.key !== 'tilting_stand');

const COMMON_MOTORS = [
  { key: 'tundish_car_1', label: 'Tundish Car-1 (LT) Motor', hp: 5, max: 8.2 },
  { key: 'tundish_car_2', label: 'Tundish Car-2 (LT) Motor', hp: 5, max: 8.2 },
  { key: 'ladle_sequence_car_1', label: 'Ladle Sequence Car-1', hp: 5, max: 8.2 },
  { key: 'ladle_sequence_car_2', label: 'Ladle Sequence Car-2', hp: 5, max: 8.2 },
  { key: 'nfc_slide_gate_power_pack', label: 'NFC Slide Gate Power Pack Motor', hp: 3, max: 4.4 },
  { key: 'slide_gate_power_pack_1', label: 'Slide Gate Power Pack-1', hp: 10, max: 14.1 },
  { key: 'slide_gate_power_pack_2', label: 'Slide Gate Power Pack-2', hp: 10, max: 14.1 },
];

/** sheet key (URL + permission key) -> { label, motors } */
export const CASTER_SHEETS = {
  'billet-strand-1': { label: 'Billet Caster Strand 1', motors: BILLET_STRAND_1_MOTORS },
  'billet-strand-2': { label: 'Billet Caster Strand 2', motors: BILLET_STRAND_2_MOTORS },
  'slab-strand-1': { label: 'Slab Caster Strand 1', motors: SLAB_STRAND_1_MOTORS },
  'slab-strand-2': { label: 'Slab Caster Strand 2', motors: SLAB_STRAND_2_MOTORS },
  'common-motor': { label: 'Common Motor', motors: COMMON_MOTORS },
};

/** Back-link target: the page that lists the sheet */
export const casterBack = (sheetKey) => {
  const key = String(sheetKey);
  if (key.startsWith('slab')) return '/sms/slab-caster';
  if (key.startsWith('billet')) return '/sms/billet-caster';
  return '/sms/billet-slab-caster';
};

export const isOverMax = (motor, value) => {
  if (value === '' || value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n) && n > motor.max;
};

export function emptyCasterForm(sheet) {
  const readings = {};
  sheet.motors.forEach((m) => { readings[m.key] = { value: '', remark: '' }; });
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    readings,
    remark: '',
  };
}
