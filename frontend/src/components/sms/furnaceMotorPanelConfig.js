/** SMS Furnace Motor Panel check sheet — keep in sync with backend/utils/smsFurnaceMotorPanelConfig.js */

export const FMP_CHECKS = [
  { key: 'drive_condition', label: 'Drive Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'drive_cooling_fan_running', label: 'Drive Cooling Fan Running', options: ['YES', 'NO'] },
  { key: 'motor_temperature', label: 'Motor Temperature', options: ['NORMAL', 'NOT NORMAL'] },
  { key: 'any_abnormality', label: 'Any Abnormality', options: ['NO', 'YES'] },
  { key: 'starter_checking', label: 'Starter Checking', options: ['OKAY', 'NOT OKAY'] },
  { key: 'panel_air_cleaning', label: 'Panel Air Cleaning', options: ['DONE', 'PREVIOUSLY DONE'], noBad: true },
];

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
