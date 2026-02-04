// Vercel Serverless Entry Point
// Wraps the Express app as a serverless function

const app = require('../backend/server');

module.exports = app;
