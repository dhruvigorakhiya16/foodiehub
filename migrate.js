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

  const queries = [
    // Users table (needed for login/register)
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone_no VARCHAR(15) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `ALTER TABLE food_items ADD COLUMN rating DECIMAL(2,1) DEFAULT 4.5`,
    `ALTER TABLE food_items ADD COLUMN is_best_seller BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE food_items ADD COLUMN food_type ENUM('Veg','Non-Veg') DEFAULT 'Veg'`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(100) NOT NULL UNIQUE,
      emoji VARCHAR(10) DEFAULT '🍽️',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `INSERT IGNORE INTO categories (category_name, description) VALUES
      ('Pizza','Wood-fired pizzas'),('Burger','Gourmet burgers'),
      ('Pasta','Italian pasta'),('Salad','Fresh salads'),
      ('Drinks','Beverages'),('Dessert','Sweet treats')`,
    `CREATE TABLE IF NOT EXISTS reservations (
      id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
      email VARCHAR(100), phone VARCHAR(15), res_date DATE NOT NULL,
      res_time TIME NOT NULL, guests INT NOT NULL, message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS cart (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT DEFAULT NULL,
      food_id INT NOT NULL, quantity INT NOT NULL DEFAULT 1,
      price DECIMAL(10,2) NOT NULL, total DECIMAL(10,2) NOT NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT DEFAULT NULL,
      customer_name VARCHAR(100) NOT NULL, email VARCHAR(100),
      phone VARCHAR(15) NOT NULL, address TEXT,
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 40.00,
      total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      order_status ENUM('confirmed','preparing','out_for_delivery','delivered','cancelled') DEFAULT 'confirmed',
      payment_method VARCHAR(50) DEFAULT 'cod', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL,
      food_item_id INT DEFAULT NULL, item_name VARCHAR(100) NOT NULL,
      quantity INT NOT NULL DEFAULT 1, price DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS contacts (
      id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL, subject VARCHAR(200) NOT NULL,
      message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT DEFAULT NULL,
      user_name VARCHAR(100) NOT NULL, rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
];

  // Hash admin password
  const adminHashedPassword = bcrypt.hashSync('admin1234', 10);
  queries.push(`INSERT IGNORE INTO admins (name, email, password) VALUES ('Admin', 'adminfoodiehub@gmail.com', '${adminHashedPassword}')`);

  let idx = 0;
  function runNext() {
    if (idx >= queries.length) { console.log('All migrations completed!'); db.end(); return; }
    db.query(queries[idx], (err, result) => {
      if (err) {
        if (err.errno === 1060 || err.errno === 1050) console.log('SKIP:', err.message);
        else console.error('ERROR:', err.message);
      } else console.log('OK:', queries[idx].substring(0, 60));
      idx++; runNext();
    });
  }
  runNext();
});
