const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', UserController.getAll);
router.post('/create', UserController.createUser);
router.get('/:id/hbm-permissions', UserController.getPermissions);
router.put('/:id/hbm-permissions', UserController.updatePermissions);
router.get('/:id/crane-permissions', UserController.getCranePermissions);
router.put('/:id/crane-permissions', UserController.updateCranePermissions);
router.get('/:id', UserController.getById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

module.exports = router;