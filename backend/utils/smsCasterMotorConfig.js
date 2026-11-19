/** SMS Billet/Slab Caster motor-current sheets — keep in sync with frontend/src/components/sms/casterMotorConfig.js */

const BILLET_STRAND_1_MOTORS = [
  { key: 'entry_top', label: 'Entry Top Motor', hp: 5, max: 8.2 },
  { key: 'entry_bottom', label: 'Entry Bottom Motor', hp: 5, max: 8.2 },
  { key: 'withdrawal', label: 'Withdrawal (Exit) Motor', hp: 5, max: 8.2 },
  { key: 'cart', label: 'Cart Motor', hp: 5, max: 7.8 },
  { key: 'drt_1', label: 'DRT Motor-1', hp: 5, max: 7.8 },
  { key: 'drt_2', label: 'DRT Motor-2', hp: 5, max: 7.8 },
  { key: 'mould_oscillation', label: 'Mould Oscillation Motor', hp: 15, max: 21 },
  { key: 'rdbs', label: 'RDBS Motor', hp: 5, max: 8.2 },
  { key: 'steam_exhaust_1', label: 'Steam Exhaust Motor-1', hp: 20, max: 20 },
  { key: 'hydraulic_1', label: 'Hydraulic Motor-1', hp: 30, max: 39.8 },
  { key: 'hydraulic_2', label: 'Hydraulic Motor-2', hp: 30, max: 39.8 },
  { key: 'hydraulic_3', label: 'Hydraulic Motor-3', hp: 30, max: 39.8 },
  { key: 'shearing_main_pump', label: 'Shearing Main Pump Motor', hp: 60, max: 81.5 },
  { key: 'shearing_lt', label: 'Shearing (LT) Motor', hp: 5, max: 7.5 },
  { key: 'shearing_oil_cooling', label: 'Shearing Oil Cooling Motor', hp: 2, max: 3.47 },
];

/** sheet key (URL + permission key) -> { label, motors } */
const CASTER_SHEETS = {
  'billet-strand-1': { label: 'Billet Caster Strand 1', motors: BILLET_STRAND_1_MOTORS },
};

const nullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/**
 * Validates readings against the sheet's motors.
 * Returns { error } or { readings } where readings = { motorKey: { value: number|null, remark } }.
 * A reading above the motor's max current needs a remark.
 */
function normalizeReadings(sheet, raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const m of sheet.motors) {
    const row = src[m.key] || {};
    const text = nullIfEmpty(row.value);
    const remark = nullIfEmpty(row.remark) || '';
    let value = null;
    if (text !== null) {
      value = Number(text);
      if (!Number.isFinite(value) || value < 0) return { error: `${m.label}: current must be a valid number` };
      if (value > m.max && !remark) {
        return { error: `${m.label}: current ${value} A is above the max ${m.max} A — a remark is required` };
      }
    }
    out[m.key] = { value, remark };
  }
  return { readings: out };
}

module.exports = { CASTER_SHEETS, nullIfEmpty, normalizeReadings };
