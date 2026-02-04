console.log('>>> REPORT ROUTES LOADED <<<');

const express = require('express');
const router = express.Router();

const ReportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

console.log('reportController:', ReportController);
/* =============================
   REPORT ROUTES
============================= */

// Preview
router.get(
  '/preview',
  authenticate,
  ReportController.getReportPreview
);

// Export Excel
router.post(
  '/export/excel',
  authenticate,
  ReportController.exportReportToExcel
);

// Export PDF ✅ ONLY ONE ROUTE
router.post(
  '/export/pdf',
  authenticate,
  (req, res, next) => {
    console.log('>>> /export/pdf ROUTE HIT <<<');
    next();
  },
  ReportController.exportReportToPDF
);

module.exports = router;
