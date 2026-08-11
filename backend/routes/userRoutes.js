const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

function selfOrAdmin(req, res, next) {
  const role = (req.user.role_name || req.user.role || '').toUpperCase();
  const userType = (req.user.user_type || '').toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || userType === 'ADMIN';
  if (String(req.user.id) === String(req.params.id) || isAdmin) return next();
  return res.status(403).json({ success: false, message: 'Access denied' });
}

router.use(authenticate);

// Own permissions (or admin reading another user)
router.get('/:id/hbm-permissions', selfOrAdmin, UserController.getPermissions);
router.get('/:id/crane-permissions', selfOrAdmin, UserController.getCranePermissions);

router.use(authorize('ADMIN'));

router.get('/', UserController.getAll);
router.post('/create', UserController.createUser);
router.put('/:id/hbm-permissions', UserController.updatePermissions);
router.put('/:id/crane-permissions', UserController.updateCranePermissions);
router.get('/:id', UserController.getById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

module.exports = router;
