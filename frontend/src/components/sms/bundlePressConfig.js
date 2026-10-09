/** SMS Bundle Press check sheet — keep in sync with backend/utils/smsBundlePressConfig.js */

const OPTIONS = ['OKAY', 'NOT OKAY'];

export const BP_MOTORS = Array.from({ length: 5 }, (_, i) => ({
  key: `motor_${i + 1}`,
  label: `Motor (60 HP)-${i + 1}`,
}));

const PARTS = ['Main Cylinder', 'Injector', 'Lock', 'Side', 'Door'];
const slug = (s) => s.toLowerCase().replace(/ /g, '_');

export const BP_GROUPS = [
  {
    title: 'Starter',
    checks: BP_MOTORS.map((m, i) => ({ key: `starter_${i + 1}`, label: `Motor-${i + 1} Starter`, options: OPTIONS })),
  },
  {
    title: 'Solonoid Coil',
    checks: PARTS.map((p) => ({ key: `solonoid_coil_${slug(p)}`, label: `${p} - Solonoid Coil`, options: OPTIONS })),
  },
  {
    title: 'Proximity Sensor',
    checks: PARTS.map((p) => ({ key: `proximity_sensor_${slug(p)}`, label: `${p} - Proximity Sensor`, options: OPTIONS })),
  },
];

export const BP_CHECKS = BP_GROUPS.flatMap((g) => g.checks);

export const BP_PHASES = [
  { key: 'r', label: 'R' },
  { key: 'y', label: 'Y' },
  { key: 'b', label: 'B' },
];

/** The first option of each check is the healthy one */
export const isBadValue = (check, value) => Boolean(value) && value !== check.options[0];

export const formatCurrents = (currents, motorKey) =>
  BP_PHASES.map((p) => currents?.[motorKey]?.[p.key] ?? '—').join(' / ');

export function emptyBundlePressForm() {
  const checks = {};
  BP_CHECKS.forEach((c) => { checks[c.key] = { value: c.options[0], remark: '' }; });
  const currents = {};
  BP_MOTORS.forEach((m) => { currents[m.key] = { r: '', y: '', b: '' }; });
  return {
    report_date: new Date().toISOString().slice(0, 10),
    recorded_by: '',
    currents,
    checks,
    remark: '',
  };
}
