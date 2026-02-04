console.log('>>> SERVER.JS LOADED <<<');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
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
const shedRoutes = require('./routes/shedRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const cronRoutes = require('./routes/cronRoutes');

// Import database
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/crane-forms', craneFormRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/cranes', craneRoutes);
app.use('/api/config', configRoutes);
app.use('/api/maintenance-schedule', maintenanceScheduleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/inspections', inspectionValueRoutes);
app.use('/api/inspections', inspectionSectionRoutes);
app.use('/api/inspection-items', inspectionItemRoutes);
app.use('/api/inspection-sections', inspectionSectionRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/cron', cronRoutes);

// app.use('/api/sheds', shedRoutes);
app.use('/api/cranes', craneRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/reports', reportRoutes);
console.log('departmentRoutes =>', typeof departmentRoutes);
console.log('shedRoutes =>', typeof shedRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Crane Maintenance Inspection System API',
    version: '3.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      forms: '/api/forms',
      craneforms: '/api/crane-forms',
      inspections: '/api/inspections',
      cranes: '/api/cranes',
      config: '/api/config',
      maintenanceSchedule: '/api/maintenance-schedule',
      reports: '/api/reports',
      telegram: '/api/telegram',
      health: '/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Only start listening + cron when running locally (not on Vercel)
if (!process.env.VERCEL) {
  const { startCronJobs } = require('./cron/cronJobs');

  const gracefulShutdown = async () => {
    console.log('Received shutdown signal. Closing HTTP server and database connections...');
    try {
      await pool.end();
      console.log('Database connections closed.');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  app.listen(PORT, () => {
    console.log(`
  ========================================
  Crane Maintenance System API Server
  ========================================
  Environment: ${process.env.NODE_ENV || 'development'}
  Port: ${PORT}
  Database: ${process.env.DB_NAME || 'crane_maintenance'}

  Ready to accept connections!
  ========================================
    `);

    startCronJobs();
  });
}

module.exports = app;
