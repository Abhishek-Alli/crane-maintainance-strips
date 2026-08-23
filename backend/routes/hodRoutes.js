const express = require('express');
const router = express.Router();
const { authenticate, requireHOD } = require('../middleware/auth');
const HodController = require('../controllers/hodController');
const HsmController = require('../controllers/hsmController');
const HsmDelayController = require('../controllers/hsmDelayController');
const HsmFmDailyController = require('../controllers/hsmFmDailyController');
const HbmController = require('../controllers/hbmController');

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

module.exports = router;
