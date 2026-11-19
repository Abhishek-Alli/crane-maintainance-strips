// Single source of truth for the SMS sheets that send Telegram notifications.
//
// To add a notification for a NEW SMS sheet: add ONE line to SMS_NOTIFY_REGISTRY below.
//   '<route segment>': { key, label, controller }
//   - route segment : the path after /api/sms/ used to save the sheet
//   - key / label   : shown on the Telegram settings screen and used for subscriptions
//   - controller    : the sheet's controller (needs a static getById)
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
  'eot-crane-maintenance': { key: 'eot-crane', label: 'EOT Crane Maintenance', controller: SmsEotCraneController },
  'crucible-maintenance': { key: 'crucible', label: 'Crucible Maintenance', controller: SmsCrucibleController },
  'poker-maintenance': { key: 'poker', label: 'Hyd Poker Maintenance', controller: SmsPokerController },
  'pump-house': { key: 'pump-house', label: 'Pump House — Mechanical', controller: SmsPumpHouseController },
  patching: { key: 'patching', label: 'Patching', controller: SmsPatchingController },
  'scrap-trolly': { key: 'scrap-trolly', label: 'Scrap Transfer Trolly', controller: SmsScrapTrollyController },
  'ladle-car': { key: 'ladle-car', label: 'Ladle Car — Mechanical', controller: SmsLadleCarController },
  pollution: { key: 'pollution', label: 'Pollution — Daily Check Sheet', controller: SmsPollutionController },
  'dm-unit': { key: 'dm-unit', label: 'DM Unit Check List', controller: SmsDmUnitController },
  'ccm-motor': { key: 'ccm-motor', label: 'CCM Motor', controller: SmsCcmMotorController },
  'pump-house-motor': { key: 'pump-house-motor', label: 'Furnace Pump House', controller: SmsPumpHouseMotorController },
  'ccm-pump-house': { key: 'ccm-pump-house', label: 'CCM Pump House', controller: SmsCcmPumpHouseController },
  'eot-crane-electrical': { key: 'eot-crane-electrical', label: 'EOT Crane — Electrical', controller: SmsEotCraneElectricalController },
  'furnace-motor-panel': { key: 'furnace-motor-panel', label: 'Furnace Motor Panel', controller: SmsFurnaceMotorPanelController },
  dg: { key: 'dg', label: 'DG', controller: SmsDgController },
  'furnace-pollution-pm': { key: 'furnace-pollution-pm', label: 'Furnace Pollution - Scheduled', controller: SmsFurnacePollutionPmController },
  'lt-transformer': { key: 'lt-transformer', label: 'LT Transformer', controller: SmsLtTransformerController },
  'compressor-pm': { key: 'compressor-pm', label: 'Compressor - Scheduled', controller: SmsCompressorPmController },
  'furnace-pollution': { key: 'furnace-pollution', label: 'Furnace Pollution', controller: SmsFurnacePollutionController },
  'furnace-stand-by': { key: 'furnace-stand-by', label: 'Furnace Stand By', controller: SmsFurnaceStandByController },
  'furnace-poker': { key: 'furnace-poker', label: 'Furnace Poker', controller: SmsFurnacePokerController },
  'bundle-press': { key: 'bundle-press', label: 'Bundle Press', controller: SmsBundlePressController },
  'furnace-transformer': { key: 'furnace-transformer', label: 'Furnace Transformer', controller: SmsFurnaceTransformerController },
};

// HSM sheets. Subscription keys are prefixed ("hsm:") so they can never clash with SMS / HBM keys.
const HSM_NOTIFY_REGISTRY = {
  'breakdown-analysis': { key: 'hsm:breakdown-analysis', label: 'Breakdown Analysis Report', controller: HsmController, method: 'getBreakdownAnalysisById' },
  'roll-change-activity': { key: 'hsm:roll-change-activity', label: 'Mechanical Activities During Roll Change', controller: HsmController, method: 'getRollChangeActivityById' },
  'delay-report': { key: 'hsm:delay-report', label: 'Delay Report', controller: HsmDelayController },
  'fm-daily-checklist': { key: 'hsm:fm-daily-checklist', label: 'FM Daily Check List', controller: HsmFmDailyController },
  'induction-daily-checklist': { key: 'hsm:induction-daily-checklist', label: 'Induction Daily Check List', controller: HsmInductionDailyController },
  'dc-daily-checklist': { key: 'hsm:dc-daily-checklist', label: 'DC Daily Check List', controller: HsmDcDailyController },
  'rm-daily-checklist': { key: 'hsm:rm-daily-checklist', label: 'RM Daily Check List', controller: HsmRmDailyController },
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

// PTM sheets (Monthly Register is a read-only view, so it has nothing to notify about).
const PTM_NOTIFY_REGISTRY = {
  logs: { key: 'ptm:checksheet', label: 'PTM Checksheet', controller: PtmController, method: 'getLogById', rows: ptmChecksheetRows },
  breakdown: { key: 'ptm:breakdown', label: 'Breakdown Report', controller: PtmController, method: 'getBreakdownLogById' },
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
