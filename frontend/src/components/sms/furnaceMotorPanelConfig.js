/** SMS Furnace Motor Panel check sheet — keep in sync with backend/utils/smsFurnaceMotorPanelConfig.js */

export const FMP_CHECKS = [
  { key: 'drive_condition', label: 'Drive Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'drive_cooling_fan_running', label: 'Drive Cooling Fan Running', options: ['YES', 'NO'] },
  { key: 'motor_temperature', label: 'Motor Temperature', options: ['NORMAL', 'NOT NORMAL'] },
  { key: 'any_abnormality', label: 'Any Abnormality', options: ['NO', 'YES'] },
  { key: 'starter_checking', label: 'Starter Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'panel_air_cleaning', label: 'Panel Air Cleaning', options: ['DONE', 'PREVIOUSLY DONE'], noBad: true },
];

const motors = (count, hp) => Array.from({ length: count }, (_, i) => `MOTOR-${i + 1} (${hp} HP)`);

/** Fixed Area → Motor list (17 motors) */
export const FMP_AREA_MOTORS = {
  'PSU DM WATER': ['MOTOR-1 (25 HP)', 'MOTOR-2 (25 HP)', 'MOTOR-3 (25 HP)', 'MOTOR 4 (25 HP)'],
  'WCC DM WATER': motors(4, 20),
  'FURNACE HYDRAULIC MOTOR': motors(3, 100),
  'FURNACE HYDRAULIC OIL COOLING MOTOR': ['MOTOR - 3 HP'],
  'SINTERING PSU MOTOR': motors(2, 20),
  'SINTERING CAP-RACK MOTOR': motors(2, 20),
  'TRANSFORMER COOLING MOTOR': motors(2, 20),
};

/** Max current (A) per area */
export const FMP_MAX_CURRENT = {
  'PSU DM WATER': 32,
  'WCC DM WATER': 26.4,
  'FURNACE HYDRAULIC MOTOR': 134,
  'FURNACE HYDRAULIC OIL COOLING MOTOR': 4.8,
  'SINTERING PSU MOTOR': 28,
  'SINTERING CAP-RACK MOTOR': 28,
  'TRANSFORMER COOLING MOTOR': 27,
};

export const FMP_AREAS = Object.keys(FMP_AREA_MOTORS);

/** The first option of each check is the healthy one (checks marked noBad have no bad option) */
export const isBadValue = (check, value) =>
  !check.noBad && Boolean(value) && value !== check.options[0];

export function emptyFurnaceMotorPanelForm() {
  const checks = {};
  FMP_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    area: '',
    motor: '',
    current_r: '',
    current_y: '',
    current_b: '',
    checks,
    remark: '',
  };
}
