// ============================================
// Vercel Serverless Entry Point
// Vercel routes /api/(.*) -> this function.
// This module wraps the Express app from backend/server.js.
// The server.js app already defines routes under /api/... and
// serves the static frontend, so we pass the request through.
// ============================================
const app = require('../backend/server');

// Vercel expects module.exports = handler
module.exports = app;
