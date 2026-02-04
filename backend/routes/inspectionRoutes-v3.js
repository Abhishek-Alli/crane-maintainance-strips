


const express = require('express');
const router = express.Router();

const InspectionController = require('../controllers/inspectionController');
const { authenticate } = require('../middleware/auth');

console.log('inspectionController:', InspectionController);
console.log('authenticate:', authenticate);

router.post('/', authenticate, InspectionController.create);
router.get('/', authenticate, InspectionController.getAllRecent);
router.get('/:id', authenticate, InspectionController.getById);

module.exports = router;
