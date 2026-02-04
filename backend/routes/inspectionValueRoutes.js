const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const InspectionValueController = require('../controllers/inspectionValueController');

router.post('/:inspectionId/values', authenticate, InspectionValueController.saveValues);

module.exports = router;
