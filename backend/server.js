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
const ptmRoutes = require('./routes/ptmRoutes');
const smsRoutes = require('./routes/smsRoutes');
const hsmRoutes = require('./routes/hsmRoutes');
const hodRoutes = require('./routes/hodRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const modulesRoutes = require('./routes/modulesRoutes');
const permissionListsRoutes = require('./routes/permissionListsRoutes');

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Uploaded images — auth required (Bearer header or ?access_token=)
const path = require('path');
const { authenticate } = require('./middleware/auth');
app.use('/uploads', authenticate, express.static(path.join(__dirname, 'uploads'), {
  fallthrough: false,
  index: false,
}));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
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
app.use('/api/ptm', ptmRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/hsm', hsmRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/permission-lists', permissionListsRoutes);

// Root Endpoint — minimal public info
app.get('/', (req, res) => {
  res.json({
    message: 'Crane Maintenance API',
    status: 'ok',
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
  if (err && err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Image too large (max 5 MB)'
        : err.code === 'LIMIT_FILE_COUNT'
          ? 'Too many images (max 10)'
          : err.message || 'Upload failed';
    return res.status(400).json({ success: false, message });
  }
  if (err && /Only image files/i.test(err.message || '')) {
    return res.status(400).json({ success: false, message: err.message });
  }
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