console.log('>>> SERVER.JS LOADED <<<');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Routes
const inspectionRoutes = require('./routes/inspectionRoutes-v3');
const craneRoutes = require('./routes/craneRoutes');
const configRoutes = require('./routes/configRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const formRoutes = require('./routes/formRoutes');
const craneFormRoutes = require('./routes/craneFormRoutes');
const maintenanceScheduleRoutes = require('./routes/maintenanceScheduleRoutes');
const reportRoutes = require('./routes/reportRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const inspectionValueRoutes = require('./routes/inspectionValueRoutes');
const inspectionSectionRoutes = require('./routes/inspectionSectionRoutes');
const inspectionItemRoutes = require('./routes/inspectionItemRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const cronRoutes = require('./routes/cronRoutes');
const hbmRoutes = require('./routes/hbmRoutes');
const pumphouseRoutes = require('./routes/pumphouseRoutes');
const fabricationRoutes = require('./routes/fabricationRoutes');

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes (NO DUPLICATES)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/crane-forms', craneFormRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/inspection-values', inspectionValueRoutes);
app.use('/api/inspection-sections', inspectionSectionRoutes);
app.use('/api/inspection-items', inspectionItemRoutes);
app.use('/api/cranes', craneRoutes);
app.use('/api/config', configRoutes);
app.use('/api/maintenance-schedule', maintenanceScheduleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/hbm', hbmRoutes);
app.use('/api/pumphouse', pumphouseRoutes);
app.use('/api', fabricationRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Crane Maintenance Inspection System API',
    version: '3.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      forms: '/api/forms',
      inspections: '/api/inspections',
      cranes: '/api/cranes',
      reports: '/api/reports',
      health: '/health'
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start Server
if (!process.env.VERCEL) {
  const { startCronJobs } = require('./cron/cronJobs');

  const gracefulShutdown = async () => {
    console.log('Shutting down...');
    try {
      await pool.end();
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  app.listen(PORT, () => {
    console.log(`
========================================
Crane Maintenance API
Port: ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
========================================
    `);

    startCronJobs();
  });
}

module.exports = app;