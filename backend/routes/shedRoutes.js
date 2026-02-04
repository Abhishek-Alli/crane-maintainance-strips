const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const ShedController = require('../controllers/shedController');

router.get('/', authenticate, ShedController.getAll);

module.exports = router;
