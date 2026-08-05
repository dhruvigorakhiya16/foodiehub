// ============================================
// Root server.js shim
// Render may be configured to run `node server.js`
// from the project root. This simply launches the
// real backend server located at backend/server.js.
// ============================================
const backend = require('./backend/server.js');

// When run as the main module, start the server.
// (module.exports.startServer is provided by backend/server.js)
if (require.main === module) {
  backend.startServer();
} else {
  // For Vercel / importers, export the Express app
  module.exports = backend;
}
