/** SMS CCM Pump House check sheet — keep in sync with backend/utils/smsCcmPumpHouseConfig.js */

export const PUMP_HOUSE_CHECKS = [
  { key: 'drive_condition', label: 'Drive Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'drive_cooling_fan_running', label: 'Drive Cooling Fan Running', options: ['YES', 'NO'] },
  { key: 'motor_temperature', label: 'Motor Temperature', options: ['NORMAL', 'NOT NORMAL'] },
  { key: 'any_abnormality', label: 'Any Abnormality', options: ['NO', 'YES'] },
  { key: 'panel_air_cleaning', label: 'Panel Air Cleaning', options: ['DONE', 'PREVIOUSLY DONE'], noBad: true },
];

const pumps = (count, hp) => Array.from({ length: count }, (_, i) => `PUMP-${i + 1} (${hp} HP)`);

/** Area → Sub-area → { motors, max current (A) } */
export const CCM_AREAS = {
  BILLET: {
    'PRIMARY MOTOR': { motors: pumps(4, 100), max: 125 },
    'SECONDARY MOTOR': { motors: pumps(4, 60), max: 80 },
    'PRIMARY COOLING TOWER': { motors: pumps(1, 25), max: 37 },
    'SECONDARY COOLING TOWER': { motors: pumps(1, 15), max: 24.5 },
  },
  COMMON: {
    'SCALE PIT': { motors: pumps(6, 40), max: 53 },
  },
  SLAB: {
    'PRIMARY MOTOR': { motors: pumps(4, 150), max: 180 },
    'SECONDARY MOTOR': { motors: pumps(4, 100), max: 125 },
    'PRIMARY COOLING TOWER': { motors: pumps(1, 15), max: 24.5 },
    'SECONDARY COOLING TOWER': { motors: pumps(2, 15), max: 24.5 },
  },
};

/** The first option of each check is the healthy one (checks marked noBad have no bad option) */
export const isBadValue = (check, value) =>
  !check.noBad && Boolean(value) && value !== check.options[0];

export function emptyCcmPumpHouseForm() {
  const checks = {};
  PUMP_HOUSE_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    area: '',
    sub_area: '',
    motor: '',
    current_r: '',
    current_y: '',
    current_b: '',
    checks,
    remark: '',
  };
}
