const express = require('express');
const router = express.Router();
const { authenticate, requireSMS } = require('../middleware/auth');
const SmsController = require('../controllers/smsController');

router.use(authenticate);
router.use(requireSMS);

router.get('/breakdown-analysis', SmsController.getBreakdownAnalysisLogs);
router.get('/breakdown-analysis/:id/pdf', SmsController.downloadBreakdownAnalysisPDF);
router.get('/breakdown-analysis/:id', SmsController.getBreakdownAnalysisById);
router.post('/breakdown-analysis', SmsController.createBreakdownAnalysis);
router.put('/breakdown-analysis/:id', SmsController.updateBreakdownAnalysis);
router.delete('/breakdown-analysis/:id', SmsController.deleteBreakdownAnalysis);

module.exports = router;
