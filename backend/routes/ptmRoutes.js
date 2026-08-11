const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const PtmController = require('../controllers/ptmController');

router.use(authenticate);

router.get('/dashboard', PtmController.getDashboardStats);
router.get('/templates', PtmController.getTemplates);
router.get('/templates/:id', PtmController.getTemplateById);
router.post('/templates', requireAdmin, PtmController.createTemplate);
router.put('/templates/:id', requireAdmin, PtmController.updateTemplate);
router.post('/templates/:id/items', requireAdmin, PtmController.addTemplateItem);
router.put('/templates/:id/items/:itemId', requireAdmin, PtmController.updateTemplateItem);
router.delete('/templates/:id/items/:itemId', requireAdmin, PtmController.deleteTemplateItem);
router.get('/logs', PtmController.getLogs);
router.get('/logs/:id', PtmController.getLogById);
router.post('/logs', PtmController.createLog);
router.get('/monthly-register/:templateId', PtmController.getMonthlyRegister);
router.get('/breakdown', PtmController.getBreakdownLogs);
router.get('/breakdown-reasons', PtmController.getBreakdownReasons);
router.get('/breakdown/:id', PtmController.getBreakdownLogById);
router.post('/breakdown', PtmController.createBreakdownLog);

// Config — Admin only
router.get('/config/mills', PtmController.getMills);
router.post('/config/mills', requireAdmin, PtmController.createMill);
router.put('/config/mills/:id', requireAdmin, PtmController.updateMill);
router.delete('/config/mills/:id', requireAdmin, PtmController.deleteMill);

router.get('/config/breakdown-types', PtmController.getBreakdownTypes);
router.post('/config/breakdown-types', requireAdmin, PtmController.createBreakdownType);
router.put('/config/breakdown-types/:id', requireAdmin, PtmController.updateBreakdownType);
router.delete('/config/breakdown-types/:id', requireAdmin, PtmController.deleteBreakdownType);

router.get('/config/sizes', PtmController.getSizes);
router.post('/config/sizes', requireAdmin, PtmController.createSize);
router.put('/config/sizes/:id', requireAdmin, PtmController.updateSize);
router.delete('/config/sizes/:id', requireAdmin, PtmController.deleteSize);

module.exports = router;
