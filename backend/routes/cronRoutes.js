// Cron Routes – HTTP endpoints triggered by Vercel Cron / external scheduler

const express = require('express');
const router = express.Router();
const { maintenanceDueAlert, dailyInspectionSummary, hbmChecksheetDailySummary } = require('../cron/cronJobs');

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCron(req, res, next) {
  // Never open in production without secret
  if (!CRON_SECRET) {
    console.error('CRON_SECRET is not set — cron HTTP endpoints are disabled');
    return res.status(503).json({ success: false, message: 'Cron endpoints not configured' });
  }
  if (req.headers.authorization === `Bearer ${CRON_SECRET}`) return next();
  // Optional local testing only when explicitly enabled
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.CRON_ALLOW_DEV === 'true'
  ) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Unauthorized' });
}

router.get('/maintenance-alert', verifyCron, async (req, res) => {
  try {
    await maintenanceDueAlert();
    res.json({ success: true, job: 'maintenance-alert', ran_at: new Date().toISOString() });
  } catch (error) {
    console.error('Cron maintenance-alert error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/daily-summary', verifyCron, async (req, res) => {
  try {
    await dailyInspectionSummary();
    res.json({ success: true, job: 'daily-summary', ran_at: new Date().toISOString() });
  } catch (error) {
    console.error('Cron daily-summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/hbm-checksheet-summary', verifyCron, async (req, res) => {
  try {
    await hbmChecksheetDailySummary();
    res.json({ success: true, job: 'hbm-checksheet-summary', ran_at: new Date().toISOString() });
  } catch (error) {
    console.error('Cron hbm-checksheet-summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
