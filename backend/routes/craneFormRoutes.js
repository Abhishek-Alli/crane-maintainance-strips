const express = require('express');
const router = express.Router();
const CraneFormController = require('../controllers/craneFormController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * POST /api/crane-forms
 * Assign form to crane (Admin only)
 * Automatically creates Google Sheet tab
 */
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), CraneFormController.assignFormToCrane);

/**
 * POST /api/crane-forms/bulk-assign
 * Bulk assign form to multiple cranes (Admin only)
 */
router.post('/bulk-assign', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), CraneFormController.bulkAssignForm);

/**
 * GET /api/crane-forms
 * Get all crane-form assignments
 */
router.get('/', authenticate, CraneFormController.getAllAssignments);

/**
 * GET /api/crane-forms/crane/:crane_id
 * Get forms assigned to a specific crane
 */
router.get('/crane/:crane_id', authenticate, CraneFormController.getFormsByCrane);

/**
 * GET /api/crane-forms/form/:form_id
 * Get cranes assigned to a specific form
 */
router.get('/form/:form_id', authenticate, CraneFormController.getCranesByForm);

/**
 * DELETE /api/crane-forms/:id
 * Remove form assignment from crane (Admin only)
 */
router.delete('/:id', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), CraneFormController.removeAssignment);

module.exports = router;
