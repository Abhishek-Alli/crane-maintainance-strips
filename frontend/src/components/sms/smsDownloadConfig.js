import { smsAPI } from '../../services/api';

/** Every SMS sheet that can be downloaded by date / month: list + single-record fetchers */
export const SMS_DOWNLOAD_SHEETS = {
  'eot-crane': { label: 'EOT Crane Maintenance', list: smsAPI.getEotCraneLogs, get: smsAPI.getEotCraneById },
  crucible: { label: 'Crucible Maintenance', list: smsAPI.getCrucibleLogs, get: smsAPI.getCrucibleById },
  poker: { label: 'Hyd Poker Maintenance', list: smsAPI.getPokerLogs, get: smsAPI.getPokerById },
  'pump-house': { label: 'Pump House — Mechanical', list: smsAPI.getPumpHouseLogs, get: smsAPI.getPumpHouseById },
  patching: { label: 'Patching', list: smsAPI.getPatchingLogs, get: smsAPI.getPatchingById },
  'scrap-trolly': { label: 'Scrap Transfer Trolly', list: smsAPI.getScrapTrollyLogs, get: smsAPI.getScrapTrollyById },
  'ladle-car': { label: 'Ladle Car — Mechanical', list: smsAPI.getLadleCarLogs, get: smsAPI.getLadleCarById },
  pollution: { label: 'Pollution — Daily Check Sheet', list: smsAPI.getPollutionLogs, get: smsAPI.getPollutionById },
  'dm-unit': { label: 'DM Unit Check List', list: smsAPI.getDmUnitLogs, get: smsAPI.getDmUnitById },
  'ccm-motor': { label: 'CCM Motor', list: smsAPI.getCcmMotorLogs, get: smsAPI.getCcmMotorById },
  'pump-house-motor': { label: 'Pump House Motor Panel', list: smsAPI.getPumpHouseMotorLogs, get: smsAPI.getPumpHouseMotorById },
  'furnace-motor-panel': { label: 'Furnace Motor Panel', list: smsAPI.getFurnaceMotorPanelLogs, get: smsAPI.getFurnaceMotorPanelById },
  dg: { label: 'DG', list: smsAPI.getDgLogs, get: smsAPI.getDgById },
  'furnace-pollution-pm': { label: 'Furnace Pollution - Scheduled', list: smsAPI.getFurnacePollutionPmLogs, get: smsAPI.getFurnacePollutionPmById },
  'lt-transformer': { label: 'LT Transformer', list: smsAPI.getLtTransformerLogs, get: smsAPI.getLtTransformerById },
  'compressor-pm': { label: 'Compressor - Scheduled', list: smsAPI.getCompressorPmLogs, get: smsAPI.getCompressorPmById },
  'furnace-pollution': { label: 'Furnace Pollution', list: smsAPI.getFurnacePollutionLogs, get: smsAPI.getFurnacePollutionById },
  'furnace-stand-by': { label: 'Furnace Stand By', list: smsAPI.getFurnaceStandByLogs, get: smsAPI.getFurnaceStandById },
  'furnace-poker': { label: 'Furnace Poker', list: smsAPI.getFurnacePokerLogs, get: smsAPI.getFurnacePokerById },
  'bundle-press': { label: 'Bundle Press', list: smsAPI.getBundlePressLogs, get: smsAPI.getBundlePressById },
  'furnace-transformer': { label: 'Furnace Transformer', list: smsAPI.getFurnaceTransformerLogs, get: smsAPI.getFurnaceTransformerById },
};

// Columns that are internal and not useful in a report
const SKIP = new Set(['images', 'can_modify', 'filled_by', 'updated_at', 'created_at', 'id']);

const pretty = (key) => String(key).replace(/_/g, ' ').toUpperCase();

const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('en-IN') : '');

/** { value, remark } leaves become two columns; other objects are walked; arrays are kept as JSON */
function flattenInto(out, prefix, value) {
  if (value === null || value === undefined) {
    out[prefix] = '';
  } else if (Array.isArray(value)) {
    out[prefix] = value.length ? JSON.stringify(value) : '';
  } else if (typeof value === 'object') {
    if ('value' in value && Object.keys(value).every((k) => k === 'value' || k === 'remark')) {
      out[prefix] = value.value ?? '';
      out[`${prefix} - REMARK`] = value.remark ?? '';
      return;
    }
    Object.entries(value).forEach(([k, v]) => flattenInto(out, prefix ? `${prefix} / ${pretty(k)}` : pretty(k), v));
  } else {
    out[prefix] = value;
  }
}

/** One record → one flat row of { COLUMN: value } */
export function flattenRecord(rec) {
  const row = { ID: rec.id };
  Object.entries(rec).forEach(([k, v]) => {
    if (SKIP.has(k)) return;
    if (k === 'report_date') { row.DATE = String(v || '').slice(0, 10); return; }
    flattenInto(row, pretty(k), v);
  });
  row['CREATED TIMESTAMP'] = fmtDateTime(rec.created_at);
  row['UPDATED TIMESTAMP'] = rec.updated_at && rec.updated_at !== rec.created_at ? fmtDateTime(rec.updated_at) : '';
  return row;
}

export const monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { date_from: `${ym}-01`, date_to: `${ym}-${String(last).padStart(2, '0')}` };
};
