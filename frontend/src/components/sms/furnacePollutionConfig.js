/** SMS Furnace Pollution daily check sheet — keep in sync with backend/utils/smsFurnacePollutionConfig.js */

export const FP_FURNACES = ['50 MT'];

export const FP_CHECKS = [
  { key: 'panel_condition', label: 'Panel Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'drive_1_check', label: 'Drive-1 Check', options: ['OKAY', 'NOT OKAY'] },
  { key: 'drive_2_check', label: 'Drive-2 Check', options: ['OKAY', 'NOT OKAY'] },
];

export const FP_MOTORS = [
  { key: 'motor_737_1', label: 'Motor (737 HP)-1' },
  { key: 'motor_737_2', label: 'Motor (737 HP)-2' },
  { key: 'top_hood_15', label: 'Top Hood Motor (15 HP)' },
  { key: 'side_hood_15', label: 'Side Hood Motor (15 HP)' },
];

export const FP_PHASES = [
  { key: 'r', label: 'R' },
  { key: 'y', label: 'Y' },
  { key: 'b', label: 'B' },
];

/** The first option of each check is the healthy one */
export const isBadValue = (check, value) => Boolean(value) && value !== check.options[0];

export const formatCurrents = (currents, motorKey) =>
  FP_PHASES.map((p) => currents?.[motorKey]?.[p.key] ?? '—').join(' / ');

export function emptyFurnacePollutionForm() {
  const checks = {};
  FP_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  const currents = {};
  FP_MOTORS.forEach((m) => { currents[m.key] = { r: '', y: '', b: '' }; });
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    furnace: FP_FURNACES[0],
    checks,
    drive_temperature: '',
    drive_temperature_remark: '',
    currents,
    remark: '',
  };
}
