const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Line 7 is likely here. Ensure 'login' is spelled correctly.
router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.getProfile);

module.exports = router;