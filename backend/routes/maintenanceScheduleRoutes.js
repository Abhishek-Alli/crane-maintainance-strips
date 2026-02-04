/**
 * Maintenance Schedule Routes
 *
 * API routes for calendar-based crane maintenance scheduling.
 */

const express = require('express');
const router = express.Router();
const MaintenanceScheduleController = require('../controllers/maintenanceScheduleController');
const { body, query } = require('express-validator');

/**
 * GET /api/maintenance-schedule/calendar
 * Get calendar data with department assignments for each day
 * Query params: year, month (optional, defaults to current)
 */
router.get('/calendar', MaintenanceScheduleController.getCalendar);

/**
 * GET /api/maintenance-schedule/status
 * Get maintenance status for a department's cranes
 * Query params: department_code (required), year, month (optional)
 */
router.get('/status', MaintenanceScheduleController.getDepartmentStatus);

/**
 * GET /api/maintenance-schedule/reschedule
 * Get all missed/pending cranes available for reschedule
 * Query params: year, month (optional)
 */
router.get('/reschedule', MaintenanceScheduleController.getRescheduleCranes);

/**
 * GET /api/maintenance-schedule/active-window
 * Get the current active maintenance window
 */
router.get('/active-window', MaintenanceScheduleController.getActiveWindow);

/**
 * GET /api/maintenance-schedule/check-window
 * Check if a crane inspection is within the correct window
 * Query params: crane_id (required), inspection_date (optional)
 */
router.get('/check-window', MaintenanceScheduleController.checkWindow);

/**
 * GET /api/maintenance-schedule/crane/:craneId
 * Get tracking status for a specific crane
 * Query params: year, month (optional)
 */
router.get('/crane/:craneId', MaintenanceScheduleController.getCraneStatus);

/**
 * POST /api/maintenance-schedule/mark-status
 * Manually mark a crane's maintenance status (Admin only)
 * Body: crane_id, year, month, status, notes (optional)
 */
router.post(
  '/mark-status',
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

/**
 * POST /api/maintenance-schedule/initialize
 * Initialize tracking records for a month (Admin only)
 * Body: year, month (optional, defaults to current)
 */
router.post(
  '/initialize',
  [
    body('year').optional().isInt({ min: 2020, max: 2100 }),
    body('month').optional().isInt({ min: 1, max: 12 })
  ],
  MaintenanceScheduleController.initializeMonth
);

/**
 * POST /api/maintenance-schedule/update-expired
 * Update expired statuses (mark PENDING as MISSED)
 */
router.post('/update-expired', MaintenanceScheduleController.updateExpiredStatuses);

module.exports = router;
