// ============================================
// Foodie Hub - Shared MySQL Connection Pool
// Works with:
//  - Local XAMPP / phpMyAdmin MySQL (localhost)
//  - Cloud MySQL (Aiven / Railway / freesqldatabase)
//    via a MYSQL_URL connection string + optional SSL
// ============================================
const mysql = require('mysql2');
const path = require('path');

// Load local .env from the backend folder
require('dotenv').config({ path: path.join(__dirname, '.env') });

let config = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
};

// Prefer a full MySQL connection string when provided (cloud deployments).
// Aiven / Railway / freesqldatabase provide a URL like:
//   mysql://user:pass@host:port/dbname
const connectionUrl =
  process.env.MYSQL_URL ||
  process.env.DATABASE_URL ||
  process.env.MYSQL_URI;

if (connectionUrl) {
  config.uri = connectionUrl;
  // Some providers require SSL
  if (String(process.env.DATABASE_SSL).toLowerCase() === 'true' || process.env.MYSQL_SSL === 'true') {
    config.ssl = { rejectUnauthorized: false };
  }
} else {
  // Local XAMPP / phpMyAdmin defaults
  config.host = process.env.DB_HOST || 'localhost';
  config.port = parseInt(process.env.DB_PORT || '3306', 10);
  config.user = process.env.DB_USER || 'root';
  config.password = process.env.DB_PASSWORD || '';
  config.database = process.env.DB_NAME || 'restaurant_db';
}

const pool = mysql.createPool(config);

// Promisified query helper (resolves to rows array)
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Promisified connection getter (for transactions)
function getConnection() {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) return reject(err);
      resolve(connection);
    });
  });
}

module.exports = { pool, query, getConnection };
