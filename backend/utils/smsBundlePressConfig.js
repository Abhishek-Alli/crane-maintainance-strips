/** SMS Bundle Press check sheet — keep in sync with frontend/src/components/sms/bundlePressConfig.js */

const OPTIONS = ['OKAY', 'NOT OKAY'];

const BP_MOTORS = Array.from({ length: 5 }, (_, i) => ({
  key: `motor_${i + 1}`,
  label: `Motor (60 HP)-${i + 1}`,
}));

const PARTS = ['Main Cylinder', 'Injector', 'Lock', 'Side', 'Door'];
const slug = (s) => s.toLowerCase().replace(/ /g, '_');

const BP_GROUPS = [
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

const BP_CHECKS = BP_GROUPS.flatMap((g) => g.checks);
const PHASES = ['r', 'y', 'b'];

const nullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** Returns a number, null for blank, or NaN for an invalid entry */
function parseNumber(v) {
  const s = nullIfEmpty(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Keeps only known checks with a valid option; missing/invalid values become empty */
function normalizeChecks(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  BP_CHECKS.forEach((c) => {
    const row = src[c.key] || {};
    const value = nullIfEmpty(row.value);
    out[c.key] = {
      value: value && c.options.includes(value) ? value : '',
      remark: nullIfEmpty(row.remark) || '',
    };
  });
  return out;
}

/** Returns { currents } (numbers or null per phase) or { error } for a non-numeric entry */
function normalizeCurrents(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const m of BP_MOTORS) {
    out[m.key] = {};
    for (const p of PHASES) {
      const n = parseNumber(src[m.key]?.[p]);
      if (Number.isNaN(n)) return { error: `${m.label} current must be a number` };
      out[m.key][p] = n;
    }
  }
  return { currents: out };
}

module.exports = { BP_MOTORS, BP_GROUPS, BP_CHECKS, nullIfEmpty, normalizeChecks, normalizeCurrents };
