/** SMS Furnace Stand By check sheet — keep in sync with backend/utils/smsFurnaceStandByConfig.js */

export const FSB_FURNACES = ['50 MT'];
export const FSB_CRUCIBLES = ['1', '2'];

export const FSB_CHECKS = [
  { key: 'lamination_sensor', label: 'Lamination Sensor', options: ['OKAY', 'NOT OKAY'] },
  { key: 'coil_cooling_sensor', label: 'Coil Cooling Sensor', options: ['OKAY', 'NOT OKAY'] },
  { key: 'furnace_hydraulic_limit', label: 'Furnace Hydraulic Limit', options: ['OKAY', 'NOT OKAY'] },
  { key: 'all_rtd_checking', label: 'All RTD Checking', options: ['OKAY', 'NOT OKAY'] },
];

/** The first option of each check is the healthy one */
export const isBadValue = (check, value) => Boolean(value) && value !== check.options[0];

export function emptyFurnaceStandByForm() {
  const checks = {};
  FSB_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    furnace: FSB_FURNACES[0],
    crucible: '',
    checks,
    remark: '',
  };
}
