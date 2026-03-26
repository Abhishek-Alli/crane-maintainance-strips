const express = require('express');
const router = express.Router();
const HbmController = require('../controllers/hbmController');
const { authenticate, requireHBM } = require('../middleware/auth');

router.use(authenticate);
router.use(requireHBM);

// Dashboard
router.get('/dashboard/stats', HbmController.getDashboardStats);
router.get('/dashboard/recent', HbmController.getRecentChecksheets);

// Machines
router.get('/machines', HbmController.getMachines);
router.get('/machines/:id', HbmController.getMachineById);
router.post('/machines', HbmController.createMachine);
router.put('/machines/:id', HbmController.updateMachine);
router.delete('/machines/:id', HbmController.deleteMachine);

// Machine template assignments
router.get('/machines/:id/templates', HbmController.getMachineTemplates);
router.post('/machines/:id/templates', HbmController.assignTemplate);

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

// PDF download  –  GET /api/hbm/pdf/:type/:id
// type: dc-motor | cooling-bed | mill-mech | rolling-stand | pumphouse
router.get('/pdf/:type/:id', HbmController.downloadHbmPDF);

module.exports = router;
