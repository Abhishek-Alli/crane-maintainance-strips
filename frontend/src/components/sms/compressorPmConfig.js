/** SMS Compressor — Scheduled PM check sheet — keep in sync with backend/utils/smsCompressorPmConfig.js */

export const CP_CHECKS = [
  { key: 'coolent_filter_condition', label: 'Coolent and Filter Condition', options: ['OKAY', 'NOT OKAY'] },
];

/** The first option of each check is the healthy one */
export const isBadValue = (check, value) => Boolean(value) && value !== check.options[0];

export function emptyCompressorPmForm() {
  const checks = {};
  CP_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  return {
    schedule_id: '',
    schedule_detail: '',
    recorded_by: '',
    checks,
    current_r: '',
    current_y: '',
    current_b: '',
    remark: '',
  };
}
