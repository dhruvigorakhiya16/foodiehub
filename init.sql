-- ============================================
-- Foodie Hub - Database Initialization Script
-- ============================================

CREATE DATABASE IF NOT EXISTS restaurant_db;
USE restaurant_db;

-- ===== USERS TABLE =====
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone_no VARCHAR(15) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== ADMINS TABLE =====
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== CATEGORIES TABLE =====
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  emoji VARCHAR(10) DEFAULT '🍽️',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== FOOD ITEMS TABLE (with all columns) =====
CREATE TABLE IF NOT EXISTS food_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  rating DECIMAL(2, 1) DEFAULT 4.5,
  category VARCHAR(50) DEFAULT 'General',
  category_id INT DEFAULT NULL,
  food_type ENUM('Veg', 'Non-Veg') DEFAULT 'Veg',
  is_best_seller BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ===== CART TABLE =====
CREATE TABLE IF NOT EXISTS cart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  food_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES food_items(id) ON DELETE CASCADE
);

-- ===== ORDERS TABLE =====
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  customer_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(15) NOT NULL,
  address TEXT DEFAULT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 40.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  order_status ENUM('confirmed','preparing','out_for_delivery','delivered','cancelled') DEFAULT 'confirmed',
  payment_method VARCHAR(50) DEFAULT 'cod',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== ORDER ITEMS TABLE =====
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  food_item_id INT DEFAULT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE SET NULL
);

-- ===== RESERVATIONS TABLE =====
CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(15) NOT NULL,
  res_date DATE NOT NULL,
  res_time TIME NOT NULL,
  guests INT NOT NULL,
  message TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== CONTACTS TABLE =====
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== REVIEWS TABLE =====
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  user_name VARCHAR(100) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== SEED CATEGORIES =====
INSERT IGNORE INTO categories (category_name, emoji, description) VALUES
  ('Pizza', '🍕', 'Wood-fired pizzas with fresh toppings'),
  ('Burger', '🍔', 'Gourmet burgers with premium ingredients'),
  ('Pasta', '🍝', 'Handmade Italian pasta dishes'),
  ('Salad', '🥗', 'Fresh and crisp garden salads'),
  ('Drinks', '🥤', 'Refreshing beverages and smoothies'),
  ('Dessert', '🍰', 'Decadent desserts and sweet treats');

-- ===== SEED ADMIN =====
INSERT IGNORE INTO admins (name, email, password) VALUES ('Admin', 'adminfoodiehub@gmail.com', 'admin1234');

-- ===== SEED FOOD ITEMS =====
INSERT IGNORE INTO food_items (name, description, price, image_url, rating, category, food_type, is_best_seller) VALUES
('Margherita Pizza', 'Classic hand-tossed pizza with fresh mozzarella, basil, and tomato sauce', 12.99, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Pizza', 'Veg', FALSE),
('Pepperoni Pizza', 'Loaded with pepperoni and melted cheese on a crispy crust', 14.99, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Pizza', 'Non-Veg', TRUE),
('Classic Burger', 'Juicy beef patty with lettuce, tomato, cheese, and special sauce', 11.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Burger', 'Non-Veg', FALSE),
('Bacon Cheeseburger', 'Premium beef with crispy bacon, cheddar, and caramelized onions', 14.49, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.8, 'Burger', 'Non-Veg', TRUE),
('Spaghetti Carbonara', 'Creamy egg-based sauce with pancetta and parmesan cheese', 13.99, 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Pasta', 'Non-Veg', FALSE),
('Penne Arrabbiata', 'Spicy tomato sauce with garlic, chili flakes, and fresh parsley', 11.49, 'https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Pasta', 'Veg', FALSE),
('Greek Salad', 'Fresh cucumbers, tomatoes, olives, and feta cheese with vinaigrette', 9.99, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.2, 'Salad', 'Veg', FALSE),
('Caesar Salad', 'Crisp romaine lettuce with parmesan, croutons, and classic Caesar dressing', 10.49, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Salad', 'Veg', FALSE),
('Fresh Lemonade', 'House-made lemonade with fresh mint and a splash of soda', 3.99, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Drinks', 'Veg', FALSE),
('Mango Smoothie', 'Creamy mango blended with yogurt and honey', 5.49, 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Drinks', 'Veg', TRUE),
('Chocolate Lava Cake', 'Warm chocolate cake with a molten center, served with ice cream', 7.99, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.9, 'Dessert', 'Veg', TRUE),
('Tiramisu', 'Classic Italian coffee-flavored dessert with mascarpone cream', 6.99, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Dessert', 'Veg', FALSE);

