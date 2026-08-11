const express = require('express');
const router = express.Router();
const { authenticate, requireHSM, requireAdmin } = require('../middleware/auth');
const { rollChangeImageUpload, excelMemoryUpload } = require('../middleware/upload');
const HsmController = require('../controllers/hsmController');
const HsmDelayController = require('../controllers/hsmDelayController');
const HsmInsightsController = require('../controllers/hsmInsightsController');

router.use(authenticate);
router.use(requireHSM);

router.get('/insights', requireAdmin, HsmInsightsController.getInsights);

router.get('/breakdown-analysis', HsmController.getBreakdownAnalysisLogs);
router.delete('/breakdown-analysis/clear-all', requireAdmin, HsmController.clearAllBreakdownAnalysis);
router.get('/breakdown-analysis/:id/pdf', HsmController.downloadBreakdownAnalysisPDF);
router.get('/breakdown-analysis/:id', HsmController.getBreakdownAnalysisById);
router.post('/breakdown-analysis', HsmController.createBreakdownAnalysis);
router.put('/breakdown-analysis/:id', HsmController.updateBreakdownAnalysis);
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
router.post('/delay-report', HsmDelayController.create);
router.put('/delay-report/:id', HsmDelayController.update);
router.delete('/delay-report/:id', HsmDelayController.remove);

module.exports = router;
