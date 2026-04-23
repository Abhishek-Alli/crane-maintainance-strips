const express = require('express');
const router = express.Router();

const InspectionController = require('../controllers/inspectionController');
const { authenticate } = require('../middleware/auth');

// CREATE inspection
router.post('/', authenticate, InspectionController.create);

// GET ALL inspections (ADD THIS)
router.get('/', authenticate, InspectionController.getAll);

// GET inspection by ID
router.get('/:id', authenticate, InspectionController.getById);

// Resend Telegram notification for a submitted inspection
router.post('/:id/resend-telegram', authenticate, InspectionController.resendTelegram);

module.exports = router;