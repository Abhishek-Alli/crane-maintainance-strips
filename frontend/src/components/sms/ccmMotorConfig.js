/** SMS CCM Motor check sheet — keep in sync with backend/utils/smsCcmMotorConfig.js */

export const CCM_MOTOR_CHECKS = [
  { key: 'panel_air_cleaning', label: 'Panel Air Cleaning', options: ['OKAY', 'NOT OKAY'] },
  { key: 'drive_status', label: 'Drive Status', options: ['OKAY', 'NOT OKAY'] },
  { key: 'motor_condition', label: 'Motor Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'motor_temperature', label: 'Motor Temperature', options: ['NORMAL', 'NOT NORMAL'] },
  { key: 'any_abnormality', label: 'Any Abnormality', options: ['NO', 'YES'] },
  { key: 'starter_condition', label: 'Starter Condition', options: ['OKAY', 'NOT OKAY'] },
];

/** The first option of each check is the healthy one */
export const isBadValue = (check, value) => Boolean(value) && value !== check.options[0];

export function emptyCcmMotorForm() {
  const checks = {};
  CCM_MOTOR_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    stand: '',
    motor: '',
    current_r: '',
    current_y: '',
    current_b: '',
    checks,
    remark: '',
  };
}
