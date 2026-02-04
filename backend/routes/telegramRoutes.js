// Telegram Routes – Recipient CRUD + Test/Broadcast

const express = require('express');
const router = express.Router();
const TelegramController = require('../controllers/telegramController');
const { authenticate, authorize } = require('../middleware/auth');

// All telegram routes require authentication + ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/recipients', TelegramController.getRecipients);
router.post('/recipients', TelegramController.addRecipient);
router.put('/recipients/:id/toggle', TelegramController.toggleRecipient);
router.delete('/recipients/:id', TelegramController.deleteRecipient);

router.post('/test', TelegramController.sendTest);
router.post('/broadcast', TelegramController.broadcast);

module.exports = router;
