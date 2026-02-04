const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const DepartmentController = require('../controllers/departmentController');

// 🔴 THIS ROUTE WAS MISSING
router.get('/', authenticate, DepartmentController.getAll);

module.exports = router;
