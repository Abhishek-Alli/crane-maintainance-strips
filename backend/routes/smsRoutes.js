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
  electricalImageUpload,
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
const SmsElectricalController = require('../controllers/smsElectricalController');
const SmsCcmMotorController = require('../controllers/smsCcmMotorController');
const SmsPumpHouseMotorController = require('../controllers/smsPumpHouseMotorController');
const SmsFurnaceMotorPanelController = require('../controllers/smsFurnaceMotorPanelController');
const SmsDgController = require('../controllers/smsDgController');
const SmsFurnacePollutionPmController = require('../controllers/smsFurnacePollutionPmController');
const SmsLtTransformerController = require('../controllers/smsLtTransformerController');
const SmsCompressorPmController = require('../controllers/smsCompressorPmController');
const SmsFurnacePollutionController = require('../controllers/smsFurnacePollutionController');
const SmsFurnaceStandByController = require('../controllers/smsFurnaceStandByController');
const SmsFurnacePokerController = require('../controllers/smsFurnacePokerController');
const SmsBundlePressController = require('../controllers/smsBundlePressController');
const SmsFurnaceTransformerController = require('../controllers/smsFurnaceTransformerController');

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

router.delete('/electrical/clear-all', requireAdmin, SmsElectricalController.clearAll);
router.get('/electrical', SmsElectricalController.getLogs);
router.get('/electrical/:id/pdf', SmsElectricalController.downloadPDF);
router.get('/electrical/:id', SmsElectricalController.getById);
router.post('/electrical', electricalImageUpload, SmsElectricalController.create);
router.put('/electrical/:id', electricalImageUpload, SmsElectricalController.update);
router.delete('/electrical/:id', SmsElectricalController.remove);

router.get('/ccm-motor', SmsCcmMotorController.getLogs);
router.get('/ccm-motor/:id', SmsCcmMotorController.getById);
router.post('/ccm-motor', SmsCcmMotorController.create);
router.put('/ccm-motor/:id', SmsCcmMotorController.update);
router.delete('/ccm-motor/:id', SmsCcmMotorController.remove);

router.get('/pump-house-motor', SmsPumpHouseMotorController.getLogs);
router.get('/pump-house-motor/:id', SmsPumpHouseMotorController.getById);
router.post('/pump-house-motor', SmsPumpHouseMotorController.create);
router.put('/pump-house-motor/:id', SmsPumpHouseMotorController.update);
router.delete('/pump-house-motor/:id', SmsPumpHouseMotorController.remove);

router.get('/furnace-motor-panel', SmsFurnaceMotorPanelController.getLogs);
router.get('/furnace-motor-panel/:id', SmsFurnaceMotorPanelController.getById);
router.post('/furnace-motor-panel', SmsFurnaceMotorPanelController.create);
router.put('/furnace-motor-panel/:id', SmsFurnaceMotorPanelController.update);
router.delete('/furnace-motor-panel/:id', SmsFurnaceMotorPanelController.remove);

router.get('/dg', SmsDgController.getLogs);
router.get('/dg/:id', SmsDgController.getById);
router.post('/dg', SmsDgController.create);
router.put('/dg/:id', SmsDgController.update);
router.delete('/dg/:id', SmsDgController.remove);

router.get('/furnace-pollution-pm', SmsFurnacePollutionPmController.getLogs);
router.get('/furnace-pollution-pm/:id', SmsFurnacePollutionPmController.getById);
router.post('/furnace-pollution-pm', SmsFurnacePollutionPmController.create);
router.put('/furnace-pollution-pm/:id', SmsFurnacePollutionPmController.update);
router.delete('/furnace-pollution-pm/:id', SmsFurnacePollutionPmController.remove);

router.get('/lt-transformer', SmsLtTransformerController.getLogs);
router.get('/lt-transformer/:id', SmsLtTransformerController.getById);
router.post('/lt-transformer', SmsLtTransformerController.create);
router.put('/lt-transformer/:id', SmsLtTransformerController.update);
router.delete('/lt-transformer/:id', SmsLtTransformerController.remove);

router.get('/compressor-pm', SmsCompressorPmController.getLogs);
router.get('/compressor-pm/:id', SmsCompressorPmController.getById);
router.post('/compressor-pm', SmsCompressorPmController.create);
router.put('/compressor-pm/:id', SmsCompressorPmController.update);
router.delete('/compressor-pm/:id', SmsCompressorPmController.remove);

router.get('/furnace-pollution', SmsFurnacePollutionController.getLogs);
router.get('/furnace-pollution/:id', SmsFurnacePollutionController.getById);
router.post('/furnace-pollution', SmsFurnacePollutionController.create);
router.put('/furnace-pollution/:id', SmsFurnacePollutionController.update);
router.delete('/furnace-pollution/:id', SmsFurnacePollutionController.remove);

router.get('/furnace-stand-by', SmsFurnaceStandByController.getLogs);
router.get('/furnace-stand-by/:id', SmsFurnaceStandByController.getById);
router.post('/furnace-stand-by', SmsFurnaceStandByController.create);
router.put('/furnace-stand-by/:id', SmsFurnaceStandByController.update);
router.delete('/furnace-stand-by/:id', SmsFurnaceStandByController.remove);

router.get('/furnace-poker', SmsFurnacePokerController.getLogs);
router.get('/furnace-poker/:id', SmsFurnacePokerController.getById);
router.post('/furnace-poker', SmsFurnacePokerController.create);
router.put('/furnace-poker/:id', SmsFurnacePokerController.update);
router.delete('/furnace-poker/:id', SmsFurnacePokerController.remove);

router.get('/bundle-press', SmsBundlePressController.getLogs);
router.get('/bundle-press/:id', SmsBundlePressController.getById);
router.post('/bundle-press', SmsBundlePressController.create);
router.put('/bundle-press/:id', SmsBundlePressController.update);
router.delete('/bundle-press/:id', SmsBundlePressController.remove);

router.get('/furnace-transformer', SmsFurnaceTransformerController.getLogs);
router.get('/furnace-transformer/:id', SmsFurnaceTransformerController.getById);
router.post('/furnace-transformer', SmsFurnaceTransformerController.create);
router.put('/furnace-transformer/:id', SmsFurnaceTransformerController.update);
router.delete('/furnace-transformer/:id', SmsFurnaceTransformerController.remove);

module.exports = router;
