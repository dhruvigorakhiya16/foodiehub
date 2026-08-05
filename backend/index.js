// ============================================
// Vercel Serverless Entry Point
// Wraps the existing Express app from backend/server.js
// so the same code runs both locally and on Vercel.
// ============================================
const app = require('./server');

// Vercel expects module.exports = handler
module.exports = app;
