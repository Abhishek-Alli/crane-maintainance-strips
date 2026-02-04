const express = require('express');
const router = express.Router();
const FormController = require('../controllers/formController');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * GET /api/forms
 * Get all forms
 */
router.get('/', authenticate, FormController.getAll);

/**
 * GET /api/forms/:id
 * Get form by ID with sections and items
 */
router.get('/:id', authenticate, FormController.getById);

/**
 * POST /api/forms
 * Create new form (Admin only)
 */
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), FormController.create);

/**
 * PUT /api/forms/:id
 * Update form (Admin only)
 */
router.put('/:id', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), FormController.update);

/**
 * DELETE /api/forms/:id
 * Delete form (Admin only)
 */
router.delete('/:id', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), FormController.delete);

module.exports = router;
