/**
 * Maintenance Schedule Routes
 */

const express = require('express');
const router = express.Router();
const MaintenanceScheduleController = require('../controllers/maintenanceScheduleController');
const { body } = require('express-validator');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/calendar', MaintenanceScheduleController.getCalendar);
router.get('/status', MaintenanceScheduleController.getDepartmentStatus);
router.get('/reschedule', MaintenanceScheduleController.getRescheduleCranes);
router.get('/active-window', MaintenanceScheduleController.getActiveWindow);
router.get('/check-window', MaintenanceScheduleController.checkWindow);
router.get('/crane/:craneId', MaintenanceScheduleController.getCraneStatus);

router.post(
  '/mark-status',
  requireAdmin,
  [
    body('crane_id').isInt().withMessage('crane_id must be an integer'),
    body('year').isInt({ min: 2020, max: 2100 }).withMessage('year must be a valid year'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('month must be 1-12'),
    body('status')
      .isIn(['PENDING', 'COMPLETED', 'MISSED', 'RESCHEDULED'])
      .withMessage('status must be PENDING, COMPLETED, MISSED, or RESCHEDULED'),
    body('notes').optional().isString()
  ],
  MaintenanceScheduleController.markStatus
);

router.post(
  '/initialize',
  requireAdmin,
  [
    body('year').optional().isInt({ min: 2020, max: 2100 }),
    body('month').optional().isInt({ min: 1, max: 12 })
  ],
  MaintenanceScheduleController.initializeMonth
);

router.post('/update-expired', requireAdmin, MaintenanceScheduleController.updateExpiredStatuses);

module.exports = router;
