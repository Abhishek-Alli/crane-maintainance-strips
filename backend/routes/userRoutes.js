const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

/**
 * GET /api/users
 * Get all users (Admin only)
 */
router.get('/', UserController.getAll);

/**
 * POST /api/users/create
 * Create a new user (Admin only)
 */
router.post('/create', UserController.createUser);

/**
 * GET /api/users/:id
 * Get user by ID (Admin only)
 */
router.get('/:id', UserController.getById);

/**
 * PUT /api/users/:id
 * Update user (Admin only)
 */
router.put('/:id', UserController.updateUser);

/**
 * DELETE /api/users/:id
 * Delete user (Admin only)
 */
router.delete('/:id', UserController.deleteUser);
module.exports = router;