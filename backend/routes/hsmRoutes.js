const express = require('express');
const router = express.Router();
const { authenticate, requireHSM, requireAdmin } = require('../middleware/auth');
const {
  rollChangeImageUpload,
  rmDailyImageUpload,
  breakdownAnalysisImageUpload,
  delayReportImageUpload,
  fmDailyImageUpload,
  inductionDailyImageUpload,
  dcDailyImageUpload,
  excelMemoryUpload,
} = require('../middleware/upload');
const HsmController = require('../controllers/hsmController');
const HsmDelayController = require('../controllers/hsmDelayController');
const HsmInsightsController = require('../controllers/hsmInsightsController');
const HsmFmDailyController = require('../controllers/hsmFmDailyController');
const HsmInductionDailyController = require('../controllers/hsmInductionDailyController');
const HsmDcDailyController = require('../controllers/hsmDcDailyController');
const HsmRmDailyController = require('../controllers/hsmRmDailyController');

router.use(authenticate);
router.use(requireHSM);

router.get('/insights', requireAdmin, HsmInsightsController.getInsights);

router.get('/breakdown-analysis', HsmController.getBreakdownAnalysisLogs);
router.delete('/breakdown-analysis/clear-all', requireAdmin, HsmController.clearAllBreakdownAnalysis);
router.get('/breakdown-analysis/:id/pdf', HsmController.downloadBreakdownAnalysisPDF);
router.get('/breakdown-analysis/:id', HsmController.getBreakdownAnalysisById);
router.post('/breakdown-analysis', breakdownAnalysisImageUpload, HsmController.createBreakdownAnalysis);
router.put('/breakdown-analysis/:id', breakdownAnalysisImageUpload, HsmController.updateBreakdownAnalysis);
router.delete('/breakdown-analysis/:id', HsmController.deleteBreakdownAnalysis);

router.get('/roll-change-activity', HsmController.getRollChangeActivityLogs);
router.delete('/roll-change-activity/clear-all', requireAdmin, HsmController.clearAllRollChangeActivity);
router.get('/roll-change-activity/:id/pdf', HsmController.downloadRollChangeActivityPDF);
router.get('/roll-change-activity/:id', HsmController.getRollChangeActivityById);
router.post('/roll-change-activity', rollChangeImageUpload, HsmController.createRollChangeActivity);
router.put('/roll-change-activity/:id', rollChangeImageUpload, HsmController.updateRollChangeActivity);
router.delete('/roll-change-activity/:id', HsmController.deleteRollChangeActivity);

router.get('/delay-report/template', HsmDelayController.downloadTemplate);
router.post('/delay-report/import', excelMemoryUpload, HsmDelayController.importExcel);
router.delete('/delay-report/clear-all', requireAdmin, HsmDelayController.clearAll);
router.get('/delay-report', HsmDelayController.getLogs);
router.get('/delay-report/:id/pdf', HsmDelayController.downloadPDF);
router.get('/delay-report/:id', HsmDelayController.getById);
router.post('/delay-report', delayReportImageUpload, HsmDelayController.create);
router.put('/delay-report/:id', delayReportImageUpload, HsmDelayController.update);
router.delete('/delay-report/:id', HsmDelayController.remove);

router.delete('/fm-daily-checklist/clear-all', requireAdmin, HsmFmDailyController.clearAll);
router.get('/fm-daily-checklist', HsmFmDailyController.getLogs);
router.get('/fm-daily-checklist/:id/pdf', HsmFmDailyController.downloadPDF);
router.get('/fm-daily-checklist/:id', HsmFmDailyController.getById);
router.post('/fm-daily-checklist', fmDailyImageUpload, HsmFmDailyController.create);
router.put('/fm-daily-checklist/:id', fmDailyImageUpload, HsmFmDailyController.update);
router.delete('/fm-daily-checklist/:id', HsmFmDailyController.remove);

router.delete('/induction-daily-checklist/clear-all', requireAdmin, HsmInductionDailyController.clearAll);
router.get('/induction-daily-checklist', HsmInductionDailyController.getLogs);
router.get('/induction-daily-checklist/:id/pdf', HsmInductionDailyController.downloadPDF);
router.get('/induction-daily-checklist/:id', HsmInductionDailyController.getById);
router.post('/induction-daily-checklist', inductionDailyImageUpload, HsmInductionDailyController.create);
router.put('/induction-daily-checklist/:id', inductionDailyImageUpload, HsmInductionDailyController.update);
router.delete('/induction-daily-checklist/:id', HsmInductionDailyController.remove);

router.delete('/dc-daily-checklist/clear-all', requireAdmin, HsmDcDailyController.clearAll);
router.get('/dc-daily-checklist', HsmDcDailyController.getLogs);
router.get('/dc-daily-checklist/:id/pdf', HsmDcDailyController.downloadPDF);
router.get('/dc-daily-checklist/:id', HsmDcDailyController.getById);
router.post('/dc-daily-checklist', dcDailyImageUpload, HsmDcDailyController.create);
router.put('/dc-daily-checklist/:id', dcDailyImageUpload, HsmDcDailyController.update);
router.delete('/dc-daily-checklist/:id', HsmDcDailyController.remove);

router.delete('/rm-daily-checklist/clear-all', requireAdmin, HsmRmDailyController.clearAll);
router.get('/rm-daily-checklist', HsmRmDailyController.getLogs);
router.get('/rm-daily-checklist/:id/pdf', HsmRmDailyController.downloadPDF);
router.get('/rm-daily-checklist/:id', HsmRmDailyController.getById);
router.post('/rm-daily-checklist', rmDailyImageUpload, HsmRmDailyController.create);
router.put('/rm-daily-checklist/:id', rmDailyImageUpload, HsmRmDailyController.update);
router.delete('/rm-daily-checklist/:id', HsmRmDailyController.remove);

module.exports = router;
