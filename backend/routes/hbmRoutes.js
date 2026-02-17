const express = require('express');
const router = express.Router();
const HbmController = require('../controllers/hbmController');
const { authenticate, requireHBM, authorize } = require('../middleware/auth');

// All HBM routes require authentication + HBM access
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

// Checksheets (filled)
router.get('/checksheets', HbmController.getChecksheets);
router.get('/checksheets/:id', HbmController.getChecksheetById);
router.post('/checksheets', HbmController.createChecksheet);

module.exports = router;
