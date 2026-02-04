const express = require('express');
const router = express.Router();
const CraneController = require('../controllers/craneController');
const { body } = require('express-validator');
const { validate, idParamValidation } = require('../validators/inspectionValidator');

/**
 * GET /api/cranes/dashboard/stats
 * Get dashboard statistics
 */
router.get('/dashboard/stats', CraneController.getDashboardStats);

/**
 * GET /api/cranes/notifications
 * Get maintenance notifications
 */
router.get('/notifications', CraneController.getNotifications);

/**
 * GET /api/cranes
 * Get all cranes
 */
router.get('/', CraneController.getAll);

/**
 * GET /api/cranes/shed/:shed_id
 * Get cranes by shed
 */
router.get('/shed/:shed_id', CraneController.getByShed);

/**
 * GET /api/cranes/:id
 * Get crane by ID
 */
router.get('/:id', validate(idParamValidation), CraneController.getById);

/**
 * POST /api/cranes
 * Create new crane
 */
router.post(
  '/',
  validate([
    body('shed_id').isInt().withMessage('Shed ID is required'),
    body('crane_number').notEmpty().withMessage('Crane number is required'),
    body('maintenance_frequency')
      .optional()
      .isIn(['DAILY', 'WEEKLY', 'MONTHLY'])
      .withMessage('Invalid maintenance frequency')
  ]),
  CraneController.create
);

/**
 * PUT /api/cranes/:id
 * Update crane
 */
router.put(
  '/:id',
  validate([
    ...idParamValidation,
    body('shed_id').isInt().withMessage('Shed ID is required'),
    body('crane_number').notEmpty().withMessage('Crane number is required'),
    body('maintenance_frequency')
      .isIn(['DAILY', 'WEEKLY', 'MONTHLY'])
      .withMessage('Invalid maintenance frequency')
  ]),
  CraneController.update
);

/**
 * DELETE /api/cranes/:id
 * Delete crane
 */
router.delete('/:id', validate(idParamValidation), CraneController.delete);

module.exports = router;
