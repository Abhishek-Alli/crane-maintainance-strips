const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// Allow any authenticated user to read their own permissions (needed on login)
router.get('/:id/hbm-permissions', UserController.getPermissions);
router.get('/:id/crane-permissions', UserController.getCranePermissions);

// All remaining routes: Admin only
router.use(authorize('ADMIN'));

router.get('/', UserController.getAll);
router.post('/create', UserController.createUser);
router.put('/:id/hbm-permissions', UserController.updatePermissions);
router.put('/:id/crane-permissions', UserController.updateCranePermissions);
router.get('/:id', UserController.getById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

module.exports = router;