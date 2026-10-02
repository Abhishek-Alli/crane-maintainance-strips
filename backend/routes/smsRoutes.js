const express = require('express');
const router = express.Router();
const { authenticate, requireSMS, requireAdmin } = require('../middleware/auth');
const {
  eotCraneImageUpload,
  crucibleImageUpload,
  pokerImageUpload,
  pumpHouseImageUpload,
  scrapTrollyImageUpload,
  ladleCarImageUpload,
  pollutionImageUpload,
  dmUnitImageUpload,
} = require('../middleware/upload');
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

router.use(authenticate);
router.use(requireSMS);

router.get('/breakdown-analysis', SmsController.getBreakdownAnalysisLogs);
router.get('/breakdown-analysis/:id/pdf', SmsController.downloadBreakdownAnalysisPDF);
router.get('/breakdown-analysis/:id', SmsController.getBreakdownAnalysisById);
router.post('/breakdown-analysis', SmsController.createBreakdownAnalysis);
router.put('/breakdown-analysis/:id', SmsController.updateBreakdownAnalysis);
router.delete('/breakdown-analysis/:id', SmsController.deleteBreakdownAnalysis);

router.get('/eot-crane-maintenance/schedules', SmsEotCraneController.getSchedules);
router.get('/eot-crane-maintenance/schedules/:id', SmsEotCraneController.getScheduleById);
router.post('/eot-crane-maintenance/schedules', SmsEotCraneController.createSchedules);
router.delete('/eot-crane-maintenance/schedules/:id', SmsEotCraneController.deleteSchedule);

router.delete('/eot-crane-maintenance/clear-all', requireAdmin, SmsEotCraneController.clearAll);
router.get('/eot-crane-maintenance', SmsEotCraneController.getLogs);
router.get('/eot-crane-maintenance/:id/pdf', SmsEotCraneController.downloadPDF);
router.get('/eot-crane-maintenance/:id', SmsEotCraneController.getById);
router.post('/eot-crane-maintenance', eotCraneImageUpload, SmsEotCraneController.create);
router.put('/eot-crane-maintenance/:id', eotCraneImageUpload, SmsEotCraneController.update);
router.delete('/eot-crane-maintenance/:id', SmsEotCraneController.remove);

router.get('/crucible-maintenance', SmsCrucibleController.getLogs);
router.get('/crucible-maintenance/:id/pdf', SmsCrucibleController.downloadPDF);
router.get('/crucible-maintenance/:id', SmsCrucibleController.getById);
router.post('/crucible-maintenance', crucibleImageUpload, SmsCrucibleController.create);
router.put('/crucible-maintenance/:id', crucibleImageUpload, SmsCrucibleController.update);
router.delete('/crucible-maintenance/:id', SmsCrucibleController.remove);

router.get('/poker-maintenance', SmsPokerController.getLogs);
router.get('/poker-maintenance/:id/pdf', SmsPokerController.downloadPDF);
router.get('/poker-maintenance/:id', SmsPokerController.getById);
router.post('/poker-maintenance', pokerImageUpload, SmsPokerController.create);
router.put('/poker-maintenance/:id', pokerImageUpload, SmsPokerController.update);
router.delete('/poker-maintenance/:id', SmsPokerController.remove);

router.get('/pump-house', SmsPumpHouseController.getLogs);
router.get('/pump-house/:id/pdf', SmsPumpHouseController.downloadPDF);
router.get('/pump-house/:id', SmsPumpHouseController.getById);
router.post('/pump-house', pumpHouseImageUpload, SmsPumpHouseController.create);
router.put('/pump-house/:id', pumpHouseImageUpload, SmsPumpHouseController.update);
router.delete('/pump-house/:id', SmsPumpHouseController.remove);

router.get('/patching', SmsPatchingController.getLogs);
router.get('/patching/:id/pdf', SmsPatchingController.downloadPDF);
router.get('/patching/:id', SmsPatchingController.getById);
router.post('/patching', SmsPatchingController.create);
router.put('/patching/:id', SmsPatchingController.update);
router.delete('/patching/:id', SmsPatchingController.remove);

router.get('/scrap-trolly', SmsScrapTrollyController.getLogs);
router.get('/scrap-trolly/:id/pdf', SmsScrapTrollyController.downloadPDF);
router.get('/scrap-trolly/:id', SmsScrapTrollyController.getById);
router.post('/scrap-trolly', scrapTrollyImageUpload, SmsScrapTrollyController.create);
router.put('/scrap-trolly/:id', scrapTrollyImageUpload, SmsScrapTrollyController.update);
router.delete('/scrap-trolly/:id', SmsScrapTrollyController.remove);

router.get('/ladle-car', SmsLadleCarController.getLogs);
router.get('/ladle-car/:id/pdf', SmsLadleCarController.downloadPDF);
router.get('/ladle-car/:id', SmsLadleCarController.getById);
router.post('/ladle-car', ladleCarImageUpload, SmsLadleCarController.create);
router.put('/ladle-car/:id', ladleCarImageUpload, SmsLadleCarController.update);
router.delete('/ladle-car/:id', SmsLadleCarController.remove);

router.get('/pollution', SmsPollutionController.getLogs);
router.get('/pollution/:id/pdf', SmsPollutionController.downloadPDF);
router.get('/pollution/:id', SmsPollutionController.getById);
router.post('/pollution', pollutionImageUpload, SmsPollutionController.create);
router.put('/pollution/:id', pollutionImageUpload, SmsPollutionController.update);
router.delete('/pollution/:id', SmsPollutionController.remove);

router.get('/dm-unit', SmsDmUnitController.getLogs);
router.get('/dm-unit/:id/pdf', SmsDmUnitController.downloadPDF);
router.get('/dm-unit/:id', SmsDmUnitController.getById);
router.post('/dm-unit', dmUnitImageUpload, SmsDmUnitController.create);
router.put('/dm-unit/:id', dmUnitImageUpload, SmsDmUnitController.update);
router.delete('/dm-unit/:id', SmsDmUnitController.remove);

module.exports = router;
