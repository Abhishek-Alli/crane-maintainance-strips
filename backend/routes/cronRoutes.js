// Cron Routes – HTTP endpoints triggered by Vercel Cron
// These replace node-cron when running on Vercel serverless

const express = require('express');
const router = express.Router();
const { maintenanceDueAlert, dailyInspectionSummary } = require('../cron/cronJobs');

const CRON_SECRET = process.env.CRON_SECRET;

// Verify request comes from Vercel Cron (or allow in dev)
function verifyCron(req, res, next) {
  if (process.env.NODE_ENV === 'development') return next();
  if (CRON_SECRET && req.headers.authorization === `Bearer ${CRON_SECRET}`) return next();
  return res.status(401).json({ success: false, message: 'Unauthorized' });
}

// GET /api/cron/maintenance-alert – triggered daily at 9 AM IST
router.get('/maintenance-alert', verifyCron, async (req, res) => {
  try {
    await maintenanceDueAlert();
    res.json({ success: true, job: 'maintenance-alert', ran_at: new Date().toISOString() });
  } catch (error) {
    console.error('Cron maintenance-alert error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/cron/daily-summary – triggered daily at 6 PM IST
router.get('/daily-summary', verifyCron, async (req, res) => {
  try {
    await dailyInspectionSummary();
    res.json({ success: true, job: 'daily-summary', ran_at: new Date().toISOString() });
  } catch (error) {
    console.error('Cron daily-summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
