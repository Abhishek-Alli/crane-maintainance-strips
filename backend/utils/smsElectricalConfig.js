'use strict';

const ELECTRICAL_AREAS = ['Furnace Area', 'CCM Area', 'Pump House', 'MCC Room', 'General'];

const ELECTRICAL_SECTIONS = [
  {
    key: 'transformer',
    label: 'Transformer',
    points: [
      { key: 'tr_oil_level',      label: 'Oil Level',              type: 'ok_not_ok' },
      { key: 'tr_oil_temp',       label: 'Oil Temperature (°C)',   type: 'number', unit: '°C', alertAbove: 85 },
      { key: 'tr_cooling_fan',    label: 'Cooling Fan Working',    type: 'ok_not_ok' },
      { key: 'tr_leakage',        label: 'Oil Leakage',            type: 'ok_not_ok', alertOn: 'NOT_OK' },
      { key: 'tr_earthing',       label: 'Earthing Connection',    type: 'ok_not_ok' },
      { key: 'tr_remark',         label: 'Remark',                 type: 'text' },
    ],
  },
  {
    key: 'motors',
    label: 'Motors & Drives',
    points: [
      { key: 'mot_temp',          label: 'Motor Body Temperature (°C)', type: 'number', unit: '°C', alertAbove: 80 },
      { key: 'mot_vibration',     label: 'Vibration / Noise',           type: 'ok_not_ok', alertOn: 'NOT_OK' },
      { key: 'mot_bearing',       label: 'Bearing Condition',           type: 'ok_not_ok' },
      { key: 'mot_cooling',       label: 'Cooling / Ventilation',       type: 'ok_not_ok' },
      { key: 'mot_insulation',    label: 'Insulation (Visual)',         type: 'ok_not_ok' },
      { key: 'mot_remark',        label: 'Remark',                     type: 'text' },
    ],
  },
  {
    key: 'panels',
    label: 'Panels / MCC',
    points: [
      { key: 'pan_breaker',       label: 'Breaker / Fuse Condition',   type: 'ok_not_ok' },
      { key: 'pan_contactor',     label: 'Contactor Condition',        type: 'ok_not_ok' },
      { key: 'pan_busbar',        label: 'Busbar / Connections Tight', type: 'ok_not_ok' },
      { key: 'pan_earthing',      label: 'Panel Earthing',             type: 'ok_not_ok' },
      { key: 'pan_indication',    label: 'Indication Lamps Working',   type: 'ok_not_ok' },
      { key: 'pan_cleanliness',   label: 'Panel Cleanliness',          type: 'ok_not_ok' },
      { key: 'pan_remark',        label: 'Remark',                     type: 'text' },
    ],
  },
  {
    key: 'cables',
    label: 'Cables & Connections',
    points: [
      { key: 'cab_condition',     label: 'Cable Condition (Visual)',   type: 'ok_not_ok' },
      { key: 'cab_tightness',     label: 'Termination Tightness',     type: 'ok_not_ok' },
      { key: 'cab_earthing',      label: 'Cable Tray Earthing',       type: 'ok_not_ok' },
      { key: 'cab_remark',        label: 'Remark',                    type: 'text' },
    ],
  },
  {
    key: 'ups_battery',
    label: 'UPS / Battery',
    points: [
      { key: 'ups_voltage',       label: 'Battery Voltage (V)',       type: 'number', unit: 'V' },
      { key: 'ups_condition',     label: 'Battery Condition',         type: 'ok_not_ok' },
      { key: 'ups_charger',       label: 'Charger Working',           type: 'ok_not_ok' },
      { key: 'ups_remark',        label: 'Remark',                    type: 'text' },
    ],
  },
  {
    key: 'general',
    label: 'General',
    points: [
      { key: 'gen_illumination',  label: 'Illumination / Lighting',   type: 'ok_not_ok' },
      { key: 'gen_alarms',        label: 'Alarm / Annunciator',       type: 'ok_not_ok' },
      { key: 'gen_fire_ext',      label: 'Fire Extinguisher Present', type: 'ok_not_ok' },
      { key: 'gen_safety_signs',  label: 'Safety Signs in Place',     type: 'ok_not_ok' },
      { key: 'gen_remark',        label: 'Remark',                    type: 'text' },
    ],
  },
];

const ALL_POINTS = ELECTRICAL_SECTIONS.flatMap((s) => s.points);
const POINT_BY_KEY = new Map(ALL_POINTS.map((p) => [p.key, p]));

function nullIfEmpty(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function hasValue(v) {
  return v != null && String(v).trim() !== '';
}

function isAlert(point, value) {
  if (!hasValue(value)) return false;
  if (point.alertOn && String(value).toUpperCase() === point.alertOn) return true;
  if (point.alertAbove != null && Number(value) > point.alertAbove) return true;
  return false;
}

function needsPhoto(point, value) {
  return isAlert(point, value);
}

function countAlerts(items) {
  let n = 0;
  for (const p of ALL_POINTS) {
    if (isAlert(p, items[p.key]?.value)) n++;
  }
  return n;
}

function normalizeChecklistItems(raw) {
  const out = {};
  for (const p of ALL_POINTS) {
    const v = raw?.[p.key];
    out[p.key] = { value: nullIfEmpty(v?.value), remark: nullIfEmpty(v?.remark) };
  }
  return out;
}

function findChecklistError(items) {
  return null; // all optional
}

module.exports = {
  ELECTRICAL_AREAS,
  ELECTRICAL_SECTIONS,
  ALL_POINTS,
  POINT_BY_KEY,
  nullIfEmpty,
  hasValue,
  isAlert,
  needsPhoto,
  countAlerts,
  normalizeChecklistItems,
  findChecklistError,
};
