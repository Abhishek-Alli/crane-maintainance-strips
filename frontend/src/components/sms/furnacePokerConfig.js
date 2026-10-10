/** SMS Furnace Poker check sheet — keep in sync with backend/utils/smsFurnacePokerConfig.js */

export const FPK_FURNACES = ['50 MT'];
export const FPK_CRUCIBLES = ['1', '2'];

export const FPK_CHECKS = [
  { key: 'panel_air_cleaning', label: 'Panel Air Cleaning', options: ['DONE', 'PREVIOUSLY DONE'], noBad: true },
  { key: 'panel_drive', label: 'Panel Drive', options: ['OKAY', 'NOT OKAY'] },
  { key: 'proximity_limit', label: 'Proximity Limit', options: ['OKAY', 'NOT OKAY'] },
  { key: 'wireless_remote_checking', label: 'Wireless Remote Checking', options: ['OKAY', 'NOT OKAY'] },
  { key: 'hydraulic_solonoid_valve', label: 'Hydraulic Solonoid Valve', options: ['OKAY', 'NOT OKAY'] },
];

export const FPK_MOTORS = [
  { key: 'lt_motor_10', label: 'LT Motor (10 HP)' },
  { key: 'hydraulic_motor_40', label: 'Hydraulic Motor (40 HP)' },
];

export const FPK_PHASES = [
  { key: 'r', label: 'R' },
  { key: 'y', label: 'Y' },
  { key: 'b', label: 'B' },
];

/** The first option of each check is the healthy one (checks marked noBad have no bad option) */
export const isBadValue = (check, value) =>
  !check.noBad && Boolean(value) && value !== check.options[0];

export const formatCurrents = (currents, motorKey) =>
  FPK_PHASES.map((p) => currents?.[motorKey]?.[p.key] ?? '—').join(' / ');

export function emptyFurnacePokerForm() {
  const checks = {};
  FPK_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  const currents = {};
  FPK_MOTORS.forEach((m) => { currents[m.key] = { r: '', y: '', b: '' }; });
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    furnace: FPK_FURNACES[0],
    crucible: '',
    checks,
    currents,
    remark: '',
  };
}
