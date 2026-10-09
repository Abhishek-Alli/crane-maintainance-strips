/** SMS Furnace Pollution — Scheduled PM check sheet — keep in sync with backend/utils/smsFurnacePollutionPmConfig.js */

const OPTIONS = ['OKAY', 'NOT OKAY'];

const numbered = (keyPrefix, label, count) =>
  Array.from({ length: count }, (_, i) => ({
    key: `${keyPrefix}_${i + 1}`,
    label: `${label}-${i + 1}`,
    options: OPTIONS,
  }));

export const FP_PM_GROUPS = [
  {
    title: 'Hood',
    checks: [
      { key: 'top_hood_limit_switch', label: 'TOP HOOD LIMIT SWITCH', options: OPTIONS },
      { key: 'side_hood_limit_switch', label: 'SIDE HOOD LIMIT SWITCH', options: OPTIONS },
    ],
  },
  { title: 'RAV', checks: numbered('rav', 'RAV', 8) },
  { title: 'Vibrator Motor', checks: numbered('vibrator_motor', 'VIBRATOR MOTOR', 8) },
  { title: 'Solonoid Coil', checks: numbered('solonoid_coil', 'SOLONOID COIL', 8) },
];

export const FP_PM_CHECKS = FP_PM_GROUPS.flatMap((g) => g.checks);

/** The first option of each check is the healthy one */
export const isBadValue = (check, value) => Boolean(value) && value !== check.options[0];

export function emptyFpPmForm() {
  const checks = {};
  FP_PM_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  return {
    schedule_id: '',
    schedule_detail: '',
    recorded_by: '',
    checks,
    remark: '',
  };
}
