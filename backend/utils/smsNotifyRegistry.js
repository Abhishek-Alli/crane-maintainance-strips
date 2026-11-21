// Single source of truth for the SMS sheets that send Telegram notifications.
//
// To add a notification for a NEW SMS sheet: add ONE line to SMS_NOTIFY_REGISTRY below.
//   '<route segment>': { key, label, controller }
//   - route segment : the path after /api/sms/ used to save the sheet
//   - key / label   : shown on the Telegram settings screen and used for subscriptions
//   - controller    : the sheet's controller (needs a static getById)
//   - table         : the sheet's database table (used by the daily status summary)
// It then (a) sends Telegram messages on every new entry and edit, and
// (b) appears automatically in the Telegram settings screen.
// Motor-current sheets are added in utils/smsCasterMotorConfig.js instead.

const SmsBundlePressController = require('../controllers/smsBundlePressController');
const SmsCcmMotorController = require('../controllers/smsCcmMotorController');
const SmsCcmPumpHouseController = require('../controllers/smsCcmPumpHouseController');
const SmsCompressorPmController = require('../controllers/smsCompressorPmController');
const SmsCrucibleController = require('../controllers/smsCrucibleController');
const SmsDgController = require('../controllers/smsDgController');
const SmsDmUnitController = require('../controllers/smsDmUnitController');
const SmsEotCraneController = require('../controllers/smsEotCraneController');
const SmsEotCraneElectricalController = require('../controllers/smsEotCraneElectricalController');
const SmsFurnaceMotorPanelController = require('../controllers/smsFurnaceMotorPanelController');
const SmsFurnacePokerController = require('../controllers/smsFurnacePokerController');
const SmsFurnacePollutionController = require('../controllers/smsFurnacePollutionController');
const SmsFurnacePollutionPmController = require('../controllers/smsFurnacePollutionPmController');
const SmsFurnaceStandByController = require('../controllers/smsFurnaceStandByController');
const SmsFurnaceTransformerController = require('../controllers/smsFurnaceTransformerController');
const SmsLadleCarController = require('../controllers/smsLadleCarController');
const SmsLtTransformerController = require('../controllers/smsLtTransformerController');
const SmsPatchingController = require('../controllers/smsPatchingController');
const SmsPokerController = require('../controllers/smsPokerController');
const SmsPollutionController = require('../controllers/smsPollutionController');
const SmsPumpHouseController = require('../controllers/smsPumpHouseController');
const SmsPumpHouseMotorController = require('../controllers/smsPumpHouseMotorController');
const SmsScrapTrollyController = require('../controllers/smsScrapTrollyController');
const HsmController = require('../controllers/hsmController');
const HsmDelayController = require('../controllers/hsmDelayController');
const HsmFmDailyController = require('../controllers/hsmFmDailyController');
const HsmInductionDailyController = require('../controllers/hsmInductionDailyController');
const HsmDcDailyController = require('../controllers/hsmDcDailyController');
const HsmRmDailyController = require('../controllers/hsmRmDailyController');
const PtmController = require('../controllers/ptmController');
const { CASTER_SHEETS } = require('./smsCasterMotorConfig');
const { isBad } = require('./telegramSmsGeneric');

const SMS_NOTIFY_REGISTRY = {
  'eot-crane-maintenance': { key: 'eot-crane', label: 'EOT Crane Maintenance', table: 'sms_eot_crane_checklists', controller: SmsEotCraneController },
  'crucible-maintenance': { key: 'crucible', label: 'Crucible Maintenance', table: 'sms_crucible_checklists', controller: SmsCrucibleController },
  'poker-maintenance': { key: 'poker', label: 'Hyd Poker Maintenance', table: 'sms_poker_checklists', controller: SmsPokerController },
  'pump-house': { key: 'pump-house', label: 'Pump House — Mechanical', table: 'sms_pump_house_checklists', controller: SmsPumpHouseController },
  patching: { key: 'patching', label: 'Patching', table: 'sms_patching_checklists', controller: SmsPatchingController },
  'scrap-trolly': { key: 'scrap-trolly', label: 'Scrap Transfer Trolly', table: 'sms_scrap_trolly_checklists', controller: SmsScrapTrollyController },
  'ladle-car': { key: 'ladle-car', label: 'Ladle Car — Mechanical', table: 'sms_ladle_car_checklists', controller: SmsLadleCarController },
  pollution: { key: 'pollution', label: 'Pollution — Daily Check Sheet', table: 'sms_pollution_checklists', controller: SmsPollutionController },
  'dm-unit': { key: 'dm-unit', label: 'DM Unit Check List', table: 'sms_dm_unit_checklists', controller: SmsDmUnitController },
  'ccm-motor': { key: 'ccm-motor', label: 'CCM Motor', table: 'sms_ccm_motor_checklists', controller: SmsCcmMotorController },
  'pump-house-motor': { key: 'pump-house-motor', label: 'Furnace Pump House', table: 'sms_pump_house_motor_checklists', controller: SmsPumpHouseMotorController },
  'ccm-pump-house': { key: 'ccm-pump-house', label: 'CCM Pump House', table: 'sms_ccm_pump_house_checklists', controller: SmsCcmPumpHouseController },
  'eot-crane-electrical': { key: 'eot-crane-electrical', label: 'EOT Crane — Electrical', table: 'sms_eot_crane_electrical_checklists', controller: SmsEotCraneElectricalController },
  'furnace-motor-panel': { key: 'furnace-motor-panel', label: 'Furnace Motor Panel', table: 'sms_furnace_motor_panel_checklists', controller: SmsFurnaceMotorPanelController },
  dg: { key: 'dg', label: 'DG', table: 'sms_dg_checklists', controller: SmsDgController },
  'furnace-pollution-pm': { key: 'furnace-pollution-pm', label: 'Furnace Pollution - Scheduled', table: 'sms_furnace_pollution_pm_checklists', controller: SmsFurnacePollutionPmController },
  'lt-transformer': { key: 'lt-transformer', label: 'LT Transformer', table: 'sms_lt_transformer_checklists', controller: SmsLtTransformerController },
  'compressor-pm': { key: 'compressor-pm', label: 'Compressor - Scheduled', table: 'sms_compressor_pm_checklists', controller: SmsCompressorPmController },
  'furnace-pollution': { key: 'furnace-pollution', label: 'Furnace Pollution', table: 'sms_furnace_pollution_checklists', controller: SmsFurnacePollutionController },
  'furnace-stand-by': { key: 'furnace-stand-by', label: 'Furnace Stand By', table: 'sms_furnace_stand_by_checklists', controller: SmsFurnaceStandByController },
  'furnace-poker': { key: 'furnace-poker', label: 'Furnace Poker', table: 'sms_furnace_poker_checklists', controller: SmsFurnacePokerController },
  'bundle-press': { key: 'bundle-press', label: 'Bundle Press', table: 'sms_bundle_press_checklists', controller: SmsBundlePressController },
  'furnace-transformer': { key: 'furnace-transformer', label: 'Furnace Transformer', table: 'sms_furnace_transformer_checklists', controller: SmsFurnaceTransformerController },
};

// HSM sheets. Subscription keys are prefixed ("hsm:") so they can never clash with SMS / HBM keys.
const HSM_NOTIFY_REGISTRY = {
  'breakdown-analysis': { key: 'hsm:breakdown-analysis', label: 'Breakdown Analysis Report', table: 'hsm_breakdown_analysis_logs', controller: HsmController, method: 'getBreakdownAnalysisById' },
  'roll-change-activity': { key: 'hsm:roll-change-activity', label: 'Mechanical Activities During Roll Change', table: 'hsm_roll_change_activity_logs', controller: HsmController, method: 'getRollChangeActivityById' },
  'delay-report': { key: 'hsm:delay-report', label: 'Delay Report', table: 'hsm_delay_reports', controller: HsmDelayController },
  'fm-daily-checklist': { key: 'hsm:fm-daily-checklist', label: 'FM Daily Check List', table: 'hsm_fm_daily_checklists', controller: HsmFmDailyController },
  'induction-daily-checklist': { key: 'hsm:induction-daily-checklist', label: 'Induction Daily Check List', table: 'hsm_induction_daily_checklists', controller: HsmInductionDailyController },
  'dc-daily-checklist': { key: 'hsm:dc-daily-checklist', label: 'DC Daily Check List', table: 'hsm_dc_daily_checklists', controller: HsmDcDailyController },
  'rm-daily-checklist': { key: 'hsm:rm-daily-checklist', label: 'RM Daily Check List', table: 'hsm_rm_daily_checklists', controller: HsmRmDailyController },
};

/** PTM checksheet: one row per item, "Section › Item" with its status / value */
function ptmChecksheetRows(record) {
  return (record.entries || []).map((e) => {
    const value = e.status || e.value_text || '';
    return {
      label: [e.section_name, e.item_name].filter(Boolean).join(' › '),
      value: String(value),
      remark: [e.remark, e.action_taken].filter(Boolean).join(' / '),
      bad: isBad(e.item_name || '', value),
    };
  }).filter((r) => r.value !== '');
}

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hoursMinutes = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

/** PTM Breakdown Report: one block per mill with its pieces, downtime and a breakdown table */
function ptmBreakdownFormat(record) {
  const slots = [...(record.slots || [])].sort((a, b) => (a.slot_order || 0) - (b.slot_order || 0));
  let total = 0;
  const blocks = slots.map((slot) => {
    const entries = slot.entries || [];
    const minutes = entries.reduce((sum, e) => sum + (Number(e.breakdown_minutes) || 0), 0);
    total += minutes;
    const facts = [
      `${slot.pipe_pieces ?? '—'} pcs`,
      `${slot.pipe_length_m ?? '—'} m`,
      Number(slot.miss_roll) ? `${slot.miss_roll} miss roll` : null,
    ].filter(Boolean).join(' · ');
    const head = `<b>${escHtml(slot.slot_label || 'Mill')}</b>  ${escHtml(facts)}\n⏱ Breakdown: <b>${hoursMinutes(minutes)}</b>`;
    if (!entries.length) return `${head}\n<i>No breakdowns</i>`;
    const typeW = Math.min(12, Math.max(4, ...entries.map((e) => String(e.breakdown_type || '').length)));
    const lines = entries.map((e) => {
      const reason = String(e.breakdown_reason || '').trim();
      return `${String(e.breakdown_type || '—').slice(0, typeW).padEnd(typeW)} ${String(e.breakdown_minutes ?? '').padStart(4)}  ${reason.length > 30 ? `${reason.slice(0, 29)}…` : reason}`;
    });
    return `${head}\n<pre>${escHtml(lines.join('\n'))}</pre>`;
  });

  const summary =
    (record.size ? `📏 Size: <b>${escHtml(record.size)}</b>\n` : '') +
    (total > 0
      ? `⚠️ Total breakdown: <b>${hoursMinutes(total)}</b> across ${slots.length} mill${slots.length === 1 ? '' : 's'}\n`
      : `✅ No breakdowns recorded\n`);
  return { html: `${summary}\n${blocks.join('\n\n')}`, hasAlert: total > 0 };
}

// PTM sheets (Monthly Register is a read-only view, so it has nothing to notify about).
const PTM_NOTIFY_REGISTRY = {
  logs: { key: 'ptm:checksheet', label: 'PTM Checksheet', controller: PtmController, method: 'getLogById', rows: ptmChecksheetRows },
  breakdown: { key: 'ptm:breakdown', label: 'Breakdown Report', table: 'ptm_breakdown_logs', controller: PtmController, method: 'getBreakdownLogById', format: ptmBreakdownFormat },
};

const CRANE_NOTIFY_SHEETS = [{ key: 'crane:inspection', label: 'Crane Inspection' }];

const uniqueSheets = (registry) => {
  const seen = new Set();
  const out = [];
  Object.values(registry).forEach(({ key, label }) => {
    if (!seen.has(key)) { seen.add(key); out.push({ key, label }); }
  });
  return out;
};

/** Every non-HBM department's notifiable sheets, for the Telegram settings screen */
function listDepartmentSheets() {
  return {
    sms: listSmsNotifySheets(),
    hsm: uniqueSheets(HSM_NOTIFY_REGISTRY),
    ptm: uniqueSheets(PTM_NOTIFY_REGISTRY),
    crane: CRANE_NOTIFY_SHEETS,
  };
}

/** [{ key, label }] — registry sheets plus the motor-current sheets, for the Telegram settings screen */
function listSmsNotifySheets() {
  const seen = new Set();
  const out = [];
  Object.values(SMS_NOTIFY_REGISTRY).forEach(({ key, label }) => {
    if (!seen.has(key)) { seen.add(key); out.push({ key, label }); }
  });
  Object.entries(CASTER_SHEETS).forEach(([key, sheet]) => {
    if (!seen.has(key)) { seen.add(key); out.push({ key, label: sheet.label }); }
  });
  return out;
}

module.exports = {
  SMS_NOTIFY_REGISTRY,
  HSM_NOTIFY_REGISTRY,
  PTM_NOTIFY_REGISTRY,
  listSmsNotifySheets,
  listDepartmentSheets,
};
