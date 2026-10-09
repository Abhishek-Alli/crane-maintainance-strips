/** SMS LT Transformer check sheet — keep in sync with backend/utils/smsLtTransformerConfig.js */

export const LT_TRANSFORMERS = ['5 MVA'];

export const LT_CHECKS = [
  { key: 'oil_level_in_mog', label: 'Oil Level in MOG', options: ['NORMAL', 'NOT NORMAL'] },
  { key: 'oil_leakages', label: 'Oil Leakages from any part', options: ['NO', 'YES'] },
  { key: 'silica_gel_condition', label: 'Silica Gel Condition', options: ['BLUE', 'NOT BLUE'] },
  { key: 'oltc_condition', label: 'OLTC Condition', options: ['OKAY', 'NOT OKAY'] },
];

/** The first option of each check is the healthy one */
export const isBadValue = (check, value) => Boolean(value) && value !== check.options[0];

export function emptyLtTransformerForm() {
  const checks = {};
  LT_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    transformer: LT_TRANSFORMERS[0],
    checks,
    oti_temperature: '',
    oti_remark: '',
    wti_temperature: '',
    wti_remark: '',
    remark: '',
  };
}
