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

/** sheet key (URL + permission key) -> { label, motors } */
export const CASTER_SHEETS = {
  'billet-strand-1': { label: 'Billet Caster Strand 1', motors: BILLET_STRAND_1_MOTORS },
};

/** Back-link target for every caster sheet */
export const CASTER_BACK = '/sms/billet-caster';

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
