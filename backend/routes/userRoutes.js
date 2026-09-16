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
router.get('/:id/hod-permissions', selfOrAdmin, UserController.getHodPermissions);
router.get('/:id/hsm-permissions', selfOrAdmin, UserController.getHsmPermissions);
router.get('/:id/ptm-permissions', selfOrAdmin, UserController.getPtmPermissions);
router.get('/:id/sms-permissions', selfOrAdmin, UserController.getSmsPermissions);

router.use(authorize('ADMIN'));

router.get('/', UserController.getAll);
router.post('/create', UserController.createUser);
router.put('/:id/hbm-permissions', UserController.updatePermissions);
router.put('/:id/crane-permissions', UserController.updateCranePermissions);
router.put('/:id/hod-permissions', UserController.updateHodPermissions);
router.put('/:id/hsm-permissions', UserController.updateHsmPermissions);
router.put('/:id/ptm-permissions', UserController.updatePtmPermissions);
router.put('/:id/sms-permissions', UserController.updateSmsPermissions);
router.get('/:id', UserController.getById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

module.exports = router;
