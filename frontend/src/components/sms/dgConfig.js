/** SMS DG check sheet — keep in sync with backend/controllers/smsDgController.js */

export const DIESEL_REFILL_OPTIONS = ['YES', 'NO'];
export const AIR_CLEANING_OPTIONS = ['DONE', 'PREVIOUSLY DONE'];

/** Status checks; a NOT OK needs a remark. The first option is the healthy one. */
export const DG_CHECKS = [
  { key: 'battery_voltage', label: 'Battery Voltage', options: ['OK', 'NOT OK'], requireRemark: true },
  { key: 'coolant_motor_condition', label: 'Coolant Motor Condition', options: ['OK', 'NOT OK'], requireRemark: true },
  { key: 'coolant_level', label: 'Coolant Level', options: ['OK', 'NOT OK'], requireRemark: true },
  { key: 'battery_charger', label: 'Battery Charger', options: ['OK', 'NOT OK'], requireRemark: true },
];

export const isBadValue = (check, value) => Boolean(value) && value !== check.options[0];

export function emptyDgForm() {
  const checks = {};
  DG_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    diesel_refill: '',
    diesel_refill_remark: '',
    air_cleaning: '',
    running_hours: '',
    running_hours_remark: '',
    checks,
    remark: '',
  };
}
