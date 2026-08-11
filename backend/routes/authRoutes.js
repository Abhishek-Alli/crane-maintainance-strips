const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
});

router.post('/login', loginLimiter, AuthController.login);
router.get('/me', authenticate, AuthController.getProfile);

module.exports = router;
