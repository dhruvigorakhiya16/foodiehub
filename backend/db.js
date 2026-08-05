// ============================================
// Foodie Hub - Shared PostgreSQL Connection Pool
// Works with Aiven PostgreSQL and Render PostgreSQL
// ============================================
const { Pool } = require('pg');
const path = require('path');

// Load local .env when running locally (Render/Aiven inject env directly)
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Build connection config from env vars (supports both direct vars and a single DATABASE_URL)
function buildConfig() {
  // If a full DATABASE_URL is provided, use it directly
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    };
  }

  return {
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
    user: process.env.PGUSER || process.env.DB_USER || 'postgres',
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.PGDATABASE || process.env.DB_NAME || 'restaurant_db',
    ssl: process.env.DATABASE_SSL === 'false'
      ? false
      : process.env.PGHOST && process.env.PGHOST !== 'localhost'
        ? { rejectUnauthorized: false }
        : false,
  };
}

const pool = new Pool(buildConfig());

// Promisified query helper
function query(text, params = []) {
  return pool.query(text, params);
}

module.exports = { pool, query };
