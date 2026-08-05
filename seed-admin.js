const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) { console.error('Connection failed:', err.message); process.exit(1); }
  console.log('Connected to MySQL');

  // Create admins table
  db.query(`CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) { console.error('Create table error:', err.message); db.end(); return; }
    console.log('admins table ready');

    // Check if admin already exists
    db.query("SELECT * FROM admins WHERE email = 'adminfoodiehub@gmail.com'", (err, results) => {
      if (err) { console.error('Query error:', err.message); db.end(); return; }
      
      if (results.length === 0) {
        // Hash the password with bcrypt before storing
        const hashedPassword = bcrypt.hashSync('admin1234', 10);
        db.query("INSERT INTO admins (name, email, password) VALUES ('Admin', 'adminfoodiehub@gmail.com', ?)", [hashedPassword], (err2, result) => {
          if (err2) { console.error('Seed error:', err2.message); } else {
            console.log('Admin user created! ID:', result.insertId);
            console.log('  Email: adminfoodiehub@gmail.com');
            console.log('  Password: admin1234 (bcrypt-hashed)');
          }
          db.end();
        });
      } else {
        console.log('Admin user already exists:', results[0].email);
        db.end();
      }
    });
  });
});

