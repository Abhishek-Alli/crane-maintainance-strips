const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const PtmController = require('../controllers/ptmController');

router.use(authenticate);

router.get('/dashboard', PtmController.getDashboardStats);
router.get('/templates', PtmController.getTemplates);
router.get('/templates/:id', PtmController.getTemplateById);
router.post('/templates', PtmController.createTemplate);
router.put('/templates/:id', PtmController.updateTemplate);
router.post('/templates/:id/items', PtmController.addTemplateItem);
router.put('/templates/:id/items/:itemId', PtmController.updateTemplateItem);
router.delete('/templates/:id/items/:itemId', PtmController.deleteTemplateItem);
router.get('/logs', PtmController.getLogs);
router.get('/logs/:id', PtmController.getLogById);
router.post('/logs', PtmController.createLog);
router.get('/monthly-register/:templateId', PtmController.getMonthlyRegister);
router.get('/breakdown', PtmController.getBreakdownLogs);
router.get('/breakdown-reasons', PtmController.getBreakdownReasons);
router.get('/breakdown/:id', PtmController.getBreakdownLogById);
router.post('/breakdown', PtmController.createBreakdownLog);

// Config
router.get('/config/mills', PtmController.getMills);
router.post('/config/mills', PtmController.createMill);
router.put('/config/mills/:id', PtmController.updateMill);
router.delete('/config/mills/:id', PtmController.deleteMill);

router.get('/config/breakdown-types', PtmController.getBreakdownTypes);
router.post('/config/breakdown-types', PtmController.createBreakdownType);
router.put('/config/breakdown-types/:id', PtmController.updateBreakdownType);
router.delete('/config/breakdown-types/:id', PtmController.deleteBreakdownType);

router.get('/config/sizes', PtmController.getSizes);
router.post('/config/sizes', PtmController.createSize);
router.put('/config/sizes/:id', PtmController.updateSize);
router.delete('/config/sizes/:id', PtmController.deleteSize);

module.exports = router;
