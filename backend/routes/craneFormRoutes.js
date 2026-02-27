const express = require('express');
const router = express.Router();
const CraneFormController = require('../controllers/craneFormController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * POST /api/crane-forms
 */
router.post(
  '/',
  authenticate,
  authorize(['SUPER_ADMIN', 'ADMIN']),
  CraneFormController.assignFormToCrane
);

/**
 * POST /api/crane-forms/bulk-assign
 */
router.post(
  '/bulk-assign',
  authenticate,
  authorize(['SUPER_ADMIN', 'ADMIN']),
  CraneFormController.bulkAssignForm
);

module.exports = router;