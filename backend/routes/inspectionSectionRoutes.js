const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const InspectionSectionController = require('../controllers/inspectionSectionController');

router.get('/form/:formId', authenticate, InspectionSectionController.getByForm);

module.exports = router;
