const express = require('express');
const router = express.Router();
const { authenticate, requireHOD } = require('../middleware/auth');
const HodController = require('../controllers/hodController');
const HsmController = require('../controllers/hsmController');
const HsmDelayController = require('../controllers/hsmDelayController');
const HsmFmDailyController = require('../controllers/hsmFmDailyController');
const HbmController = require('../controllers/hbmController');
const SmsController = require('../controllers/smsController');
const SmsEotCraneController = require('../controllers/smsEotCraneController');
const SmsCrucibleController = require('../controllers/smsCrucibleController');
const SmsPokerController = require('../controllers/smsPokerController');
const SmsPumpHouseController = require('../controllers/smsPumpHouseController');
const SmsPatchingController = require('../controllers/smsPatchingController');
const SmsScrapTrollyController = require('../controllers/smsScrapTrollyController');
const SmsLadleCarController = require('../controllers/smsLadleCarController');
const SmsPollutionController = require('../controllers/smsPollutionController');
const SmsDmUnitController = require('../controllers/smsDmUnitController');
const SmsElectricalController = require('../controllers/smsElectricalController');
const SmsFurnaceStandByController = require('../controllers/smsFurnaceStandByController');
const SmsBundlePressController = require('../controllers/smsBundlePressController');
const SmsFurnaceMotorPanelController = require('../controllers/smsFurnaceMotorPanelController');
const SmsFurnacePokerController = require('../controllers/smsFurnacePokerController');
const SmsFurnaceTransformerController = require('../controllers/smsFurnaceTransformerController');
const SmsFurnacePollutionController = require('../controllers/smsFurnacePollutionController');
const SmsFurnacePollutionPmController = require('../controllers/smsFurnacePollutionPmController');
const SmsCompressorPmController = require('../controllers/smsCompressorPmController');
const SmsDgController = require('../controllers/smsDgController');
const SmsLtTransformerController = require('../controllers/smsLtTransformerController');
const SmsPumpHouseMotorController = require('../controllers/smsPumpHouseMotorController');
const SmsCcmMotorController = require('../controllers/smsCcmMotorController');

router.use(authenticate);
router.use(requireHOD);

// Scope + sign-offs
router.get('/scope', HodController.getMyScope);
router.get('/signoffs', HodController.getSignoffs);
router.post('/signoff', HodController.upsertSignoff);

const scope = (sheetKey) => HodController.requireScope(sheetKey);

// Read-only reuse of the existing HSM controllers (list + PDF), scope-guarded.
// FM Daily Check List
router.get('/sheets/fm-daily-checklist', scope('fm-daily-checklist'), HsmFmDailyController.getLogs);
router.get('/sheets/fm-daily-checklist/:id', scope('fm-daily-checklist'), HsmFmDailyController.getById);
router.get('/sheets/fm-daily-checklist/:id/pdf', scope('fm-daily-checklist'), HsmFmDailyController.downloadPDF);

// Delay Report
router.get('/sheets/delay-report', scope('delay-report'), HsmDelayController.getLogs);
router.get('/sheets/delay-report/:id', scope('delay-report'), HsmDelayController.getById);
router.get('/sheets/delay-report/:id/pdf', scope('delay-report'), HsmDelayController.downloadPDF);

// Breakdown Analysis
router.get('/sheets/breakdown-analysis', scope('breakdown-analysis'), HsmController.getBreakdownAnalysisLogs);
router.get('/sheets/breakdown-analysis/:id', scope('breakdown-analysis'), HsmController.getBreakdownAnalysisById);
router.get('/sheets/breakdown-analysis/:id/pdf', scope('breakdown-analysis'), HsmController.downloadBreakdownAnalysisPDF);

// Roll Change Activity
router.get('/sheets/roll-change-activity', scope('roll-change-activity'), HsmController.getRollChangeActivityLogs);
router.get('/sheets/roll-change-activity/:id', scope('roll-change-activity'), HsmController.getRollChangeActivityById);
router.get('/sheets/roll-change-activity/:id/pdf', scope('roll-change-activity'), HsmController.downloadRollChangeActivityPDF);

// ── HBM Sheets ────────────────────────────────────────────────────────────────
const hbmScope = (key) => HodController.requireScope(key, 'HBM_CHECKSHEETS');

router.get('/sheets/dc-motor',         hbmScope('dc-motor'),         HbmController.getDcMotorLogs);
router.get('/sheets/dc-motor/:id',     hbmScope('dc-motor'),         HbmController.getDcMotorLogById);

router.get('/sheets/rolling-stand',    hbmScope('rolling-stand'),    HbmController.getRollingStandLogs);
router.get('/sheets/rolling-stand/:id',hbmScope('rolling-stand'),    HbmController.getRollingStandLogById);

router.get('/sheets/mill-mech',        hbmScope('mill-mech'),        HbmController.getMillMechLogs);
router.get('/sheets/mill-mech/:id',    hbmScope('mill-mech'),        HbmController.getMillMechLogById);

router.get('/sheets/cooling-bed',      hbmScope('cooling-bed'),      HbmController.getCoolingBedLogs);
router.get('/sheets/cooling-bed/:id',  hbmScope('cooling-bed'),      HbmController.getCoolingBedLogById);

router.get('/sheets/pumphouse',        hbmScope('pumphouse'),        HbmController.getPumpHouseLogs);
router.get('/sheets/pumphouse/:id',    hbmScope('pumphouse'),        HbmController.getPumpHouseLogById);

router.get('/sheets/bar-bundle',       hbmScope('bar-bundle'),       HbmController.getBarBundleLogs);
router.get('/sheets/bar-bundle/:id',   hbmScope('bar-bundle'),       HbmController.getBarBundleLogById);

router.get('/sheets/before-rolling',   hbmScope('before-rolling'),   HbmController.getBeforeRollingLogs);
router.get('/sheets/before-rolling/:id',hbmScope('before-rolling'),  HbmController.getBeforeRollingLogById);

router.get('/sheets/pump-param',       hbmScope('pump-param'),       HbmController.getPumpParamLogs);
router.get('/sheets/pump-param/:id',   hbmScope('pump-param'),       HbmController.getPumpParamLogById);

router.get('/sheets/water-param',      hbmScope('water-param'),      HbmController.getWaterParamLogs);
router.get('/sheets/water-param/:id',  hbmScope('water-param'),      HbmController.getWaterParamLogById);

router.get('/sheets/ph-maint',         hbmScope('ph-maint'),         HbmController.getPhMaintLogs);
router.get('/sheets/ph-maint/:id',     hbmScope('ph-maint'),         HbmController.getPhMaintLogById);

router.get('/sheets/transformer',      hbmScope('transformer'),      HbmController.getTransformerLogs);
router.get('/sheets/transformer/:id',  hbmScope('transformer'),      HbmController.getTransformerLogById);

router.get('/sheets/oil-level',        hbmScope('oil-level'),        HbmController.getOilLevelLogs);
router.get('/sheets/oil-level/:id',    hbmScope('oil-level'),        HbmController.getOilLevelLogById);

router.get('/sheets/dc-motor-airflow', hbmScope('dc-motor-airflow'), HbmController.getDcMotorAirflowLogs);
router.get('/sheets/dc-motor-airflow/:id',hbmScope('dc-motor-airflow'),HbmController.getDcMotorAirflowLogById);

router.get('/sheets/roughing-gb-temp', hbmScope('roughing-gb-temp'), HbmController.getRoughingGbTempLogs);
router.get('/sheets/roughing-gb-temp/:id',hbmScope('roughing-gb-temp'),HbmController.getRoughingGbTempLogById);

router.get('/sheets/breakdown',        hbmScope('breakdown'),        HbmController.getBreakdownLogs);
router.get('/sheets/breakdown/:id',    hbmScope('breakdown'),        HbmController.getBreakdownLogById);

// ── SMS Sheets ────────────────────────────────────────────────────────────────
const smsScope = (key) => HodController.requireScope(key, 'SMS_CHECKSHEETS');

router.get('/sheets/sms-breakdown-analysis',      smsScope('sms-breakdown-analysis'),  SmsController.getBreakdownAnalysisLogs);
router.get('/sheets/sms-breakdown-analysis/:id',  smsScope('sms-breakdown-analysis'),  SmsController.getBreakdownAnalysisById);

router.get('/sheets/eot-crane-maintenance',       smsScope('eot-crane-maintenance'),   SmsEotCraneController.getLogs);
router.get('/sheets/eot-crane-maintenance/:id',   smsScope('eot-crane-maintenance'),   SmsEotCraneController.getById);

router.get('/sheets/crucible-maintenance',        smsScope('crucible-maintenance'),    SmsCrucibleController.getLogs);
router.get('/sheets/crucible-maintenance/:id',    smsScope('crucible-maintenance'),    SmsCrucibleController.getById);

router.get('/sheets/poker-maintenance',           smsScope('poker-maintenance'),       SmsPokerController.getLogs);
router.get('/sheets/poker-maintenance/:id',       smsScope('poker-maintenance'),       SmsPokerController.getById);

router.get('/sheets/sms-pump-house',              smsScope('sms-pump-house'),          SmsPumpHouseController.getLogs);
router.get('/sheets/sms-pump-house/:id',          smsScope('sms-pump-house'),          SmsPumpHouseController.getById);

router.get('/sheets/sms-patching',                smsScope('sms-patching'),            SmsPatchingController.getLogs);
router.get('/sheets/sms-patching/:id',            smsScope('sms-patching'),            SmsPatchingController.getById);

router.get('/sheets/scrap-trolly',                smsScope('scrap-trolly'),            SmsScrapTrollyController.getLogs);
router.get('/sheets/scrap-trolly/:id',            smsScope('scrap-trolly'),            SmsScrapTrollyController.getById);

router.get('/sheets/ladle-car',                   smsScope('ladle-car'),               SmsLadleCarController.getLogs);
router.get('/sheets/ladle-car/:id',               smsScope('ladle-car'),               SmsLadleCarController.getById);

router.get('/sheets/sms-pollution',               smsScope('sms-pollution'),           SmsPollutionController.getLogs);
router.get('/sheets/sms-pollution/:id',           smsScope('sms-pollution'),           SmsPollutionController.getById);

router.get('/sheets/dm-unit',                     smsScope('dm-unit'),                 SmsDmUnitController.getLogs);
router.get('/sheets/dm-unit/:id',                 smsScope('dm-unit'),                 SmsDmUnitController.getById);

router.get('/sheets/electrical',                  smsScope('electrical'),              SmsElectricalController.getLogs);
router.get('/sheets/electrical/:id',              smsScope('electrical'),              SmsElectricalController.getById);

router.get('/sheets/furnace-stand-by',            smsScope('furnace-stand-by'),        SmsFurnaceStandByController.getLogs);
router.get('/sheets/furnace-stand-by/:id',        smsScope('furnace-stand-by'),        SmsFurnaceStandByController.getById);

router.get('/sheets/bundle-press',                smsScope('bundle-press'),            SmsBundlePressController.getLogs);
router.get('/sheets/bundle-press/:id',            smsScope('bundle-press'),            SmsBundlePressController.getById);

router.get('/sheets/furnace-motor-panel',         smsScope('furnace-motor-panel'),     SmsFurnaceMotorPanelController.getLogs);
router.get('/sheets/furnace-motor-panel/:id',     smsScope('furnace-motor-panel'),     SmsFurnaceMotorPanelController.getById);

router.get('/sheets/furnace-poker',               smsScope('furnace-poker'),           SmsFurnacePokerController.getLogs);
router.get('/sheets/furnace-poker/:id',           smsScope('furnace-poker'),           SmsFurnacePokerController.getById);

router.get('/sheets/furnace-transformer',         smsScope('furnace-transformer'),     SmsFurnaceTransformerController.getLogs);
router.get('/sheets/furnace-transformer/:id',     smsScope('furnace-transformer'),     SmsFurnaceTransformerController.getById);

router.get('/sheets/furnace-pollution',           smsScope('furnace-pollution'),       SmsFurnacePollutionController.getLogs);
router.get('/sheets/furnace-pollution/:id',       smsScope('furnace-pollution'),       SmsFurnacePollutionController.getById);

router.get('/sheets/furnace-pollution-pm',        smsScope('furnace-pollution-pm'),    SmsFurnacePollutionPmController.getLogs);
router.get('/sheets/furnace-pollution-pm/:id',    smsScope('furnace-pollution-pm'),    SmsFurnacePollutionPmController.getById);

router.get('/sheets/compressor-pm',               smsScope('compressor-pm'),           SmsCompressorPmController.getLogs);
router.get('/sheets/compressor-pm/:id',           smsScope('compressor-pm'),           SmsCompressorPmController.getById);

router.get('/sheets/sms-dg',                      smsScope('sms-dg'),                  SmsDgController.getLogs);
router.get('/sheets/sms-dg/:id',                  smsScope('sms-dg'),                  SmsDgController.getById);

router.get('/sheets/lt-transformer',              smsScope('lt-transformer'),          SmsLtTransformerController.getLogs);
router.get('/sheets/lt-transformer/:id',          smsScope('lt-transformer'),          SmsLtTransformerController.getById);

router.get('/sheets/pump-house-motor',            smsScope('pump-house-motor'),        SmsPumpHouseMotorController.getLogs);
router.get('/sheets/pump-house-motor/:id',        smsScope('pump-house-motor'),        SmsPumpHouseMotorController.getById);

router.get('/sheets/ccm-motor',                   smsScope('ccm-motor'),               SmsCcmMotorController.getLogs);
router.get('/sheets/ccm-motor/:id',               smsScope('ccm-motor'),               SmsCcmMotorController.getById);

module.exports = router;
