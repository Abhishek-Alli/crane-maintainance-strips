/** SMS Furnace Transformer check sheet — keep in sync with backend/utils/smsFurnaceTransformerConfig.js */

// The third name was cut off in the source sheet ("10 MVA (SINTE…") — confirm the full name
export const FT_TRANSFORMERS = ['16 MVA (A)', '16 MVA (B)', '10 MVA (SINTER)'];

export const FT_CHECKS = [
  { key: 'oil_level_in_mog', label: 'Oil Level in MOG', options: ['NORMAL', 'NOT NORMAL'] },
  { key: 'oil_leakages', label: 'Oil Leakages from any part', options: ['NO', 'YES'] },
  { key: 'silica_gel_condition', label: 'Silica Gel Condition', options: ['BLUE', 'NOT BLUE'] },
  { key: 'announciator_condition', label: 'Announciator Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'oil_pump_condition', label: 'Oil Pump Condition', options: ['OKAY', 'NOT OKAY'] },
  { key: 'oil_pressure_switch_condition', label: 'Oil Pressure Switch Condition', options: ['OKAY', 'NOT OKAY'] },
];

/** The first option of each check is the healthy one */
export const isBadValue = (check, value) => Boolean(value) && value !== check.options[0];

export function emptyFurnaceTransformerForm() {
  const checks = {};
  FT_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    transformer: '',
    checks,
    oti_temperature: '',
    oti_remark: '',
    wti_temperature: '',
    wti_remark: '',
    remark: '',
  };
}
