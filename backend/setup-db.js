// ============================================
// Foodie Hub - PostgreSQL Database Setup
// Creates all tables + seeds admin + food items
// Works with Aiven or Render PostgreSQL
// ============================================
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const createTablesSQL = `
  -- ===== USERS =====
  CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone_no VARCHAR(15) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ===== ADMINS =====
  CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ===== CATEGORIES =====
  CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      category_name VARCHAR(100) UNIQUE NOT NULL,
      emoji VARCHAR(10) DEFAULT '🍽️',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ===== FOOD ITEMS =====
  CREATE TABLE IF NOT EXISTS food_items (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL,
      image VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      image_url VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      rating NUMERIC(2, 1) DEFAULT 4.5,
      category VARCHAR(50) DEFAULT 'General',
      category_id INT DEFAULT NULL,
      food_type VARCHAR(10) DEFAULT 'Veg',
      is_best_seller BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ===== CART =====
  CREATE TABLE IF NOT EXISTS cart (
      id SERIAL PRIMARY KEY,
      user_id INT DEFAULT NULL,
      food_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price NUMERIC(10, 2) NOT NULL,
      total NUMERIC(10, 2) NOT NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ===== ORDERS =====
  CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INT DEFAULT NULL,
      customer_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) DEFAULT NULL,
      phone VARCHAR(15) NOT NULL,
      address TEXT DEFAULT NULL,
      subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 40.00,
      total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      order_status VARCHAR(20) DEFAULT 'confirmed',
      payment_method VARCHAR(50) DEFAULT 'cod',
      item_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ===== ORDER ITEMS =====
  CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT NOT NULL,
      food_item_id INT DEFAULT NULL,
      item_name VARCHAR(100) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price NUMERIC(10, 2) NOT NULL,
      subtotal NUMERIC(10, 2) NOT NULL
  );

  -- ===== RESERVATIONS =====
  CREATE TABLE IF NOT EXISTS reservations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) DEFAULT NULL,
      phone VARCHAR(15) NOT NULL,
      res_date DATE NOT NULL,
      res_time TIME NOT NULL,
      guests INT NOT NULL,
      message TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ===== CONTACTS =====
  CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      subject VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- ===== REVIEWS =====
  CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INT DEFAULT NULL,
      user_name VARCHAR(100) NOT NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const seedSQL = `
  -- Seed categories
  INSERT INTO categories (category_name, emoji, description) VALUES
    ('Pizza', '🍕', 'Wood-fired pizzas'),
    ('Burger', '🍔', 'Gourmet burgers'),
    ('Pasta', '🍝', 'Italian pasta'),
    ('Salad', '🥗', 'Fresh salads'),
    ('Drinks', '🥤', 'Beverages'),
    ('Dessert', '🍰', 'Sweet treats')
  ON CONFLICT (category_name) DO NOTHING;

  -- Seed food items
  INSERT INTO food_items (name, description, price, image, image_url, rating, category, food_type, is_best_seller) VALUES
    ('Margherita Pizza', 'Classic hand-tossed pizza with fresh mozzarella, basil, and tomato sauce', 12.99, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Pizza', 'Veg', false),
    ('Pepperoni Pizza', 'Loaded with pepperoni and melted cheese on a crispy crust', 14.99, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Pizza', 'Non-Veg', true),
    ('Classic Burger', 'Juicy beef patty with lettuce, tomato, cheese, and special sauce', 11.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Burger', 'Non-Veg', false),
    ('Bacon Cheeseburger', 'Premium beef with crispy bacon, cheddar, and caramelized onions', 14.49, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.8, 'Burger', 'Non-Veg', true),
    ('Spaghetti Carbonara', 'Creamy egg-based sauce with pancetta and parmesan cheese', 13.99, 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Pasta', 'Non-Veg', false),
    ('Penne Arrabbiata', 'Spicy tomato sauce with garlic, chili flakes, and fresh parsley', 11.49, 'https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Pasta', 'Veg', false),
    ('Greek Salad', 'Fresh cucumbers, tomatoes, olives, and feta cheese with vinaigrette', 9.99, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.2, 'Salad', 'Veg', false),
    ('Caesar Salad', 'Crisp romaine lettuce with parmesan, croutons, and classic Caesar dressing', 10.49, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Salad', 'Veg', false),
    ('Fresh Lemonade', 'House-made lemonade with fresh mint and a splash of soda', 3.99, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Drinks', 'Veg', false),
    ('Mango Smoothie', 'Creamy mango blended with yogurt and honey', 5.49, 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Drinks', 'Veg', true),
    ('Chocolate Lava Cake', 'Warm chocolate cake with a molten center, served with ice cream', 7.99, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.9, 'Dessert', 'Veg', true),
    ('Tiramisu', 'Classic Italian coffee-flavored dessert with mascarpone cream', 6.99, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Dessert', 'Veg', false);
`;

// Split a multi-statement SQL string into individual executable statements.
// The PostgreSQL 'pg' driver does NOT support multiple statements in one
// query() call, so we split on ';' and run each statement separately.
function splitSql(sql) {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function setupDatabase() {
  try {
    console.log('Connecting to PostgreSQL...');

    // Execute each CREATE TABLE statement individually
    const createStatements = splitSql(createTablesSQL);
    for (const stmt of createStatements) {
      await pool.query(stmt);
    }
    console.log('✅ Tables created successfully!');

    // Execute each seed INSERT statement individually
    const seedStatements = splitSql(seedSQL);
    for (const stmt of seedStatements) {
      await pool.query(stmt);
    }
    console.log('✅ Categories & food items seeded');

    // Seed admin (bcrypt-hashed)
    const admins = await pool.query("SELECT * FROM admins WHERE email = 'adminfoodiehub@gmail.com'");
    if (admins.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin1234', 10);
      await pool.query(
        'INSERT INTO admins (name, email, password, role) VALUES ($1, $2, $3, $4)',
        ['Admin', 'adminfoodiehub@gmail.com', hashedPassword, 'admin']
      );
      console.log('✅ Admin seeded: adminfoodiehub@gmail.com / admin1234');
    } else {
      console.log('ℹ️ Admin already exists');
    }

    console.log('✅ Database setup complete!');
    return true;
  } catch (err) {
    console.error('❌ Error setting up database:', err.message);
    return false;
  }
}

// Run setup automatically when executed directly (node setup-db.js)
if (require.main === module) {
  setupDatabase().finally(() => pool.end());
}

module.exports = setupDatabase;
