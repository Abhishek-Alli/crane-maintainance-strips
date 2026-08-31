const express = require('express');
const router = express.Router();
const HbmController = require('../controllers/hbmController');
const { authenticate, requireHBM, requireAdmin } = require('../middleware/auth');

router.use(authenticate);
router.use(requireHBM);

// Dashboard
router.get('/dashboard/stats', HbmController.getDashboardStats);
router.get('/dashboard/recent', HbmController.getRecentChecksheets);

// Monthly Insights
router.get('/monthly-insights', HbmController.getMonthlyInsights);
router.get('/monthly-detail/:type', HbmController.getMonthlyDetail);
router.get('/monthly-register/:type', HbmController.getMonthlyRegister);

// Machines — Admin only for mutations
router.get('/machines', HbmController.getMachines);
router.get('/machines/:id', HbmController.getMachineById);
router.post('/machines', requireAdmin, HbmController.createMachine);
router.put('/machines/:id', requireAdmin, HbmController.updateMachine);
router.delete('/machines/:id', requireAdmin, HbmController.deleteMachine);

// Machine template assignments
router.get('/machines/:id/templates', HbmController.getMachineTemplates);
router.post('/machines/:id/templates', requireAdmin, HbmController.assignTemplate);

// Checksheet templates
router.get('/templates', HbmController.getTemplates);
router.get('/templates/:id', HbmController.getTemplateById);

// Universal checksheets (template-based)
router.get('/checksheets', HbmController.getChecksheets);
router.get('/checksheets/:id', HbmController.getChecksheetById);
router.post('/checksheets', HbmController.createChecksheet);

// DC Motor logs
router.get('/dc-motor', HbmController.getDcMotorLogs);
router.get('/dc-motor/:id', HbmController.getDcMotorLogById);
router.post('/dc-motor', HbmController.createDcMotorLog);

// Cooling Bed logs
router.get('/cooling-bed', HbmController.getCoolingBedLogs);
router.get('/cooling-bed/:id', HbmController.getCoolingBedLogById);
router.post('/cooling-bed', HbmController.createCoolingBedLog);

// Mill Mechanical logs
router.get('/mill-mech', HbmController.getMillMechLogs);
router.get('/mill-mech/:id', HbmController.getMillMechLogById);
router.post('/mill-mech', HbmController.createMillMechLog);

// Rolling Stand logs
router.get('/rolling-stand', HbmController.getRollingStandLogs);
router.get('/rolling-stand/:id', HbmController.getRollingStandLogById);
router.post('/rolling-stand', HbmController.createRollingStandLog);

// Pumphouse logs
router.get('/pumphouse', HbmController.getPumpHouseLogs);
router.get('/pumphouse/:id', HbmController.getPumpHouseLogById);
router.post('/pumphouse', HbmController.createPumpHouseLog);

// Bar Bundle Area logs
router.get('/bar-bundle', HbmController.getBarBundleLogs);
router.get('/bar-bundle/:id', HbmController.getBarBundleLogById);
router.post('/bar-bundle', HbmController.createBarBundleLog);

// Before Rolling logs
router.get('/before-rolling', HbmController.getBeforeRollingLogs);
router.get('/before-rolling/:id', HbmController.getBeforeRollingLogById);
router.post('/before-rolling', HbmController.createBeforeRollingLog);

// Pump Parameter Report logs
router.get('/pump-param', HbmController.getPumpParamLogs);
router.get('/pump-param/:id', HbmController.getPumpParamLogById);
router.post('/pump-param', HbmController.createPumpParamLog);

// Visual Inspection & HBM Transformer logs
router.get('/transformer', HbmController.getTransformerLogs);
router.get('/transformer/:id/pdf', HbmController.downloadTransformerPDF);
router.get('/transformer/:id', HbmController.getTransformerLogById);
router.post('/transformer', HbmController.createTransformerLog);

// Pump House Maintenance Work Sheet logs
router.get('/ph-maint', HbmController.getPhMaintLogs);
router.get('/ph-maint/:id/pdf', HbmController.downloadPhMaintPDF);
router.get('/ph-maint/:id', HbmController.getPhMaintLogById);
router.post('/ph-maint', HbmController.createPhMaintLog);

// Pump House Water Parameter logs
router.get('/water-param', HbmController.getWaterParamLogs);
router.get('/water-param/:id/pdf', HbmController.downloadWaterParamPDF);
router.get('/water-param/:id', HbmController.getWaterParamLogById);
router.post('/water-param', HbmController.createWaterParamLog);

// Daily Oil Level Sheet logs
router.get('/oil-level', HbmController.getOilLevelLogs);
router.get('/oil-level/:id', HbmController.getOilLevelLogById);
router.post('/oil-level', HbmController.createOilLevelLog);

// DC Motor Airflow, Temperature & Vibration Report logs
router.get('/dc-motor-airflow', HbmController.getDcMotorAirflowLogs);
router.get('/dc-motor-airflow/:id', HbmController.getDcMotorAirflowLogById);
router.post('/dc-motor-airflow', HbmController.createDcMotorAirflowLog);

// Roughing Stand & Gearbox Bearing Temperature
router.get('/roughing-gb-temp', HbmController.getRoughingGbTempLogs);
router.get('/roughing-gb-temp/:id', HbmController.getRoughingGbTempLogById);
router.post('/roughing-gb-temp', HbmController.createRoughingGbTempLog);

// HBM Breakdown Report
router.get('/breakdown', HbmController.getBreakdownLogs);
router.get('/breakdown-reasons', HbmController.getBreakdownReasons);
router.get('/breakdown/:id/pdf', HbmController.downloadBreakdownPDF);
router.get('/breakdown/:id', HbmController.getBreakdownLogById);
router.post('/breakdown', HbmController.createBreakdownLog);

// PDF download  –  GET /api/hbm/pdf/:type/:id
// type: dc-motor | cooling-bed | mill-mech | rolling-stand | pumphouse | bar-bundle
router.get('/pdf/:type/:id', HbmController.downloadHbmPDF);

// Sheet Viewer — flat rows for any sheet type
router.get('/sheet-view/:type', HbmController.getSheetView);

// Send today's notifications for all filled sheets — Admin only
router.post('/send-daily-notifications', requireAdmin, HbmController.sendDailyNotifications);

// Send daily status summary (filled / prev date / not filled) — Admin only
router.post('/send-status-summary', requireAdmin, HbmController.sendStatusSummary);

// Update a log entry (original filler or admin, within 24 hours)
router.put('/:type/:id', HbmController.updateHbmLog);

// Delete a log entry (admin only)
router.delete('/:type/:id', HbmController.deleteHbmLog);

// Resend Telegram notification for any HBM checksheet — Admin only
router.post('/:type/:id/resend-telegram', requireAdmin, HbmController.resendTelegramNotification);

module.exports = router;
