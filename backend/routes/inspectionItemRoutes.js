const express = require('express');
const router = express.Router();
const InspectionItemController = require('../controllers/inspectionItemController');
const { authenticate } = require('../middleware/auth');

router.get('/section/:sectionId', authenticate, InspectionItemController.getBySection);

module.exports = router;
