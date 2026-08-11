const express = require('express');
const router = express.Router();
const CraneController = require('../controllers/craneController');
const { body } = require('express-validator');
const { validate, idParamValidation } = require('../validators/inspectionValidator');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

/**
 * GET /api/cranes/dashboard/stats
 */
router.get('/dashboard/stats', CraneController.getDashboardStats);

/**
 * GET /api/cranes/notifications
 */
router.get('/notifications', CraneController.getNotifications);

/**
 * GET /api/cranes
 */
router.get('/', CraneController.getAll);

/**
 * GET /api/cranes/shed/:shed_id
 */
router.get('/shed/:shed_id', CraneController.getByShed);

/**
 * GET /api/cranes/:id
 */
router.get('/:id', validate(idParamValidation), CraneController.getById);

/**
 * POST /api/cranes — Admin only
 */
router.post(
  '/',
  requireAdmin,
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
 * PUT /api/cranes/:id — Admin only
 */
router.put(
  '/:id',
  requireAdmin,
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
 * DELETE /api/cranes/:id — Admin only
 */
router.delete('/:id', requireAdmin, validate(idParamValidation), CraneController.delete);

module.exports = router;
