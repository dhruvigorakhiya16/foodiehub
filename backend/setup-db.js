// ============================================
// Foodie Hub - MySQL Database Setup
// Creates all tables + seeds admin + food items
// Works with local XAMPP / phpMyAdmin MySQL
// ============================================
const bcrypt = require('bcryptjs');
const { pool, query } = require('./db');

const createTablesSQL = [
  `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone_no VARCHAR(15) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(100) UNIQUE NOT NULL,
      emoji VARCHAR(10) DEFAULT '🍽️',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS food_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      image VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      image_url VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      rating DECIMAL(2, 1) DEFAULT 4.5,
      category VARCHAR(50) DEFAULT 'General',
      category_id INT DEFAULT NULL,
      food_type ENUM('Veg','Non-Veg') DEFAULT 'Veg',
      is_best_seller BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS cart (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      food_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price DECIMAL(10, 2) NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      customer_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) DEFAULT NULL,
      phone VARCHAR(15) NOT NULL,
      address TEXT DEFAULT NULL,
      subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 40.00,
      total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      order_status ENUM('confirmed','preparing','out_for_delivery','delivered','cancelled') DEFAULT 'confirmed',
      payment_method VARCHAR(50) DEFAULT 'cod',
      item_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      food_item_id INT DEFAULT NULL,
      item_name VARCHAR(100) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price DECIMAL(10, 2) NOT NULL,
      subtotal DECIMAL(10, 2) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reservations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) DEFAULT NULL,
      phone VARCHAR(15) NOT NULL,
      res_date DATE NOT NULL,
      res_time TIME NOT NULL,
      guests INT NOT NULL,
      message TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      subject VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      user_name VARCHAR(100) NOT NULL,
      rating INT NOT NULL,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
];

const seedCategoriesSQL = `INSERT IGNORE INTO categories (category_name, emoji, description) VALUES
  ('Pizza','🍕','Wood-fired pizzas'),('Burger','🍔','Gourmet burgers'),
  ('Pasta','🍝','Italian pasta'),('Salad','🥗','Fresh salads'),
  ('Drinks','🥤','Beverages'),('Dessert','🍰','Sweet treats'),
  ('Chinese','🥡','Wok-fired Chinese'),('Indian','🍛','Aromatic Indian curries'),
  ('Mexican','🌮','Bold Mexican flavors'),('Breakfast','🍳','Start your day right'),
  ('Seafood','🦞','Fresh from the ocean'),('BBQ','🍖','Smoky grilled classics'),
  ('Soups','🍜','Warm & comforting')`;

// [name, description, price, rating, category, food_type, is_best_seller, image]
const foods = [
  ['Margherita Pizza','Classic hand-tossed pizza with fresh mozzarella, basil, and tomato sauce',12.99,4.7,'Pizza','Veg',false,'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Pepperoni Pizza','Loaded with pepperoni and melted cheese on a crispy crust',14.99,4.5,'Pizza','Non-Veg',true,'https://images.unsplash.com/photo-1628840042765-356cda07504e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['BBQ Chicken Pizza','Tangy BBQ sauce with grilled chicken, red onions, and cilantro',15.99,4.6,'Pizza','Non-Veg',false,'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Veggie Supreme Pizza','Garden-fresh bell peppers, mushrooms, olives, and onions',13.49,4.4,'Pizza','Veg',false,'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Mushroom Truffle Pizza','Wild mushrooms, truffle oil, and melted fontina cheese',16.99,4.8,'Pizza','Veg',true,'https://images.unsplash.com/photo-1458642849426-cfb724f15ef7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Hawaiian Pizza','Pineapple, ham, and mozzarella on a classic crust',13.99,4.3,'Pizza','Non-Veg',false,'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Classic Burger','Juicy beef patty with lettuce, tomato, cheese, and special sauce',11.99,4.6,'Burger','Non-Veg',false,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Bacon Cheeseburger','Premium beef with crispy bacon, cheddar, and caramelized onions',14.49,4.8,'Burger','Non-Veg',true,'https://images.unsplash.com/photo-1553979459-d2229ba7433b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Veggie Burger','House-made black bean patty with avocado and sprouts',10.99,4.3,'Burger','Veg',false,'https://images.unsplash.com/photo-1585238342024-78d387f4a707?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Mushroom Swiss Burger','Portobello mushroom with melted Swiss cheese and garlic aioli',13.99,4.5,'Burger','Veg',false,'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Double Cheese Burger','Two beef patties with double cheddar and secret sauce',16.99,4.7,'Burger','Non-Veg',true,'https://images.unsplash.com/photo-1586816001966-79b736744398?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Crispy Chicken Burger','Crispy fried chicken breast with slaw and spicy mayo',12.49,4.5,'Burger','Non-Veg',false,'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Spaghetti Carbonara','Creamy egg-based sauce with pancetta and parmesan cheese',13.99,4.4,'Pasta','Non-Veg',false,'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Penne Arrabbiata','Spicy tomato sauce with garlic, chili flakes, and fresh parsley',11.49,4.3,'Pasta','Veg',false,'https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Fettuccine Alfredo','Rich and creamy parmesan sauce with fettuccine pasta',13.49,4.5,'Pasta','Veg',false,'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Baked Ziti','Pasta baked with ricotta, mozzarella, and marinara sauce',12.99,4.4,'Pasta','Veg',false,'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Pesto Genovese','Fresh basil pesto with pine nuts, cherry tomatoes, and parmesan',12.99,4.6,'Pasta','Veg',true,'https://images.unsplash.com/photo-1612874742237-6526221588e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Lasagna Bolognese','Layers of pasta with rich meat sauce, bechamel, and cheese',15.49,4.7,'Pasta','Non-Veg',false,'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Greek Salad','Fresh cucumbers, tomatoes, olives, and feta cheese with vinaigrette',9.99,4.2,'Salad','Veg',false,'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Caesar Salad','Crisp romaine lettuce with parmesan, croutons, and classic Caesar dressing',10.49,4.5,'Salad','Veg',false,'https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Mediterranean Salad','Cucumber, tomato, red onion, olives, and feta with lemon dressing',10.99,4.3,'Salad','Veg',false,'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Kale & Quinoa Bowl','Superfood kale, quinoa, roasted sweet potato, and tahini dressing',11.99,4.4,'Salad','Veg',false,'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Grilled Chicken Caesar','Classic Caesar with grilled chicken breast and croutons',12.99,4.6,'Salad','Non-Veg',true,'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Fresh Lemonade','House-made lemonade with fresh mint and a splash of soda',3.99,4.6,'Drinks','Veg',false,'https://images.unsplash.com/photo-1544145945-f90425340c7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Mango Smoothie','Creamy mango blended with yogurt and honey',5.49,4.4,'Drinks','Veg',true,'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Iced Matcha Latte','Premium Japanese matcha whisked with oat milk over ice',4.99,4.5,'Drinks','Veg',false,'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Cold Brew Coffee','Slow-steeped 24-hour cold brew served over ice',3.99,4.4,'Drinks','Veg',false,'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Fresh Orange Juice','Squeezed-to-order orange juice from farm-fresh oranges',4.49,4.3,'Drinks','Veg',false,'https://images.unsplash.com/photo-1613478223719-2ab802602423?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Chocolate Lava Cake','Warm chocolate cake with a molten center, served with ice cream',7.99,4.9,'Dessert','Veg',true,'https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Tiramisu','Classic Italian coffee-flavored dessert with mascarpone cream',6.99,4.7,'Dessert','Veg',false,'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['New York Cheesecake','Creamy classic cheesecake with berry compote',7.49,4.8,'Dessert','Veg',true,'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Creme Brulee','Vanilla custard with caramelized sugar top',6.99,4.6,'Dessert','Veg',false,'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Apple Pie','Warm apple pie with cinnamon and vanilla ice cream',6.49,4.5,'Dessert','Veg',false,'https://images.unsplash.com/photo-1621743478912-cc8a86d7e8b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Brownie Sundae','Warm chocolate brownie with vanilla ice cream and fudge sauce',7.99,4.7,'Dessert','Veg',false,'https://images.unsplash.com/photo-1563805042-7684c019e1cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Kung Pao Chicken','Spicy stir-fried chicken with peanuts, chili, and vegetables',13.99,4.5,'Chinese','Non-Veg',false,'https://images.unsplash.com/photo-1525755662778-989d0524087e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Vegetable Fried Rice','Wok-fried rice with mixed vegetables and soy sauce',9.99,4.3,'Chinese','Veg',false,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Mapo Tofu','Silken tofu in spicy Sichuan chili bean sauce',11.49,4.4,'Chinese','Veg',false,'https://images.unsplash.com/photo-1582452919408-aca1e7ec5c0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Sweet & Sour Pork','Crispy battered pork with tangy sweet and sour sauce',14.49,4.6,'Chinese','Non-Veg',true,'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Spring Rolls (6 pcs)','Crispy rolls stuffed with vegetables, served with sweet chili dip',6.99,4.2,'Chinese','Veg',false,'https://images.unsplash.com/photo-1583471726578-c10237645e62?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Butter Chicken','Tender chicken in rich creamy tomato gravy with butter naan',15.99,4.8,'Indian','Non-Veg',true,'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Paneer Tikka Masala','Grilled cottage cheese in spiced onion-tomato gravy',13.99,4.6,'Indian','Veg',false,'https://images.unsplash.com/photo-1565557623262-b51c2513a641?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Dal Makhani','Slow-cooked black lentils with cream and aromatic spices',10.99,4.5,'Indian','Veg',false,'https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Chicken Biryani','Fragrant basmati rice layered with spiced chicken and saffron',14.99,4.7,'Indian','Non-Veg',true,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Garlic Naan','Soft leavened bread brushed with garlic butter',3.49,4.4,'Indian','Veg',false,'https://images.unsplash.com/photo-1565557623262-b51c2513a641?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Chicken Tacos (3 pcs)','Soft corn tortillas with seasoned chicken, salsa, and guacamole',11.99,4.5,'Mexican','Non-Veg',false,'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Veggie Burrito','Large flour tortilla filled with rice, beans, veggies, and cheese',10.99,4.3,'Mexican','Veg',false,'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Nachos Supreme','Crispy tortilla chips topped with cheese, jalapenos, salsa, and sour cream',9.49,4.4,'Mexican','Veg',false,'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Beef Quesadilla','Grilled flour tortilla with seasoned beef, cheese, and pico de gallo',12.49,4.6,'Mexican','Non-Veg',true,'https://images.unsplash.com/photo-1618040996337-56904b7850b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Guacamole & Chips','Fresh table-side guacamole with crispy tortilla chips',7.99,4.5,'Mexican','Veg',false,'https://images.unsplash.com/photo-1600335895229-6e755c92e0e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Classic Pancakes','Fluffy buttermilk pancakes with maple syrup and fresh berries',8.99,4.6,'Breakfast','Veg',false,'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Avocado Toast','Smashed avocado on sourdough with cherry tomatoes and poached egg',10.49,4.4,'Breakfast','Veg',false,'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Full English Breakfast','Eggs, bacon, sausage, baked beans, toast, and grilled tomato',13.99,4.7,'Breakfast','Non-Veg',true,'https://images.unsplash.com/photo-1603046891744-1f76eb10d0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['French Toast','Thick brioche dipped in cinnamon egg batter, topped with berries',9.99,4.5,'Breakfast','Veg',false,'https://images.unsplash.com/photo-1484723091739-30a097e8f929?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Omelette','Three-egg omelette with your choice of cheese, veggies, or ham',8.99,4.3,'Breakfast','Veg',false,'https://images.unsplash.com/photo-1510693206972-df098062cb71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Grilled Salmon','Atlantic salmon fillet with lemon butter sauce and seasonal vegetables',18.99,4.7,'Seafood','Non-Veg',true,'https://images.unsplash.com/photo-1467003909585-2f8a72700288?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Shrimp Scampi','Garlic butter shrimp served over linguine pasta',16.99,4.6,'Seafood','Non-Veg',false,'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Fish & Chips','Beer-battered cod with crispy fries and tartar sauce',14.49,4.4,'Seafood','Non-Veg',false,'https://images.unsplash.com/photo-1579214297307-c36a17496a1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Lobster Bisque','Rich and creamy lobster soup with a hint of brandy',9.99,4.5,'Seafood','Non-Veg',false,'https://images.unsplash.com/photo-1594756202469-9ff9799b2e4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Calamari Fritti','Crispy fried calamari rings with marinara and lemon aioli',10.99,4.3,'Seafood','Non-Veg',false,'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Smoked Brisket Plate','Slow-smoked beef brisket with house BBQ sauce and coleslaw',18.99,4.8,'BBQ','Non-Veg',true,'https://images.unsplash.com/photo-1558030089-5b5e3c3c1f0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['BBQ Ribs (Half Rack)','Fall-off-the-bone pork ribs glazed with signature BBQ sauce',16.99,4.7,'BBQ','Non-Veg',true,'https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Grilled Chicken Wings','Crispy wings tossed in your choice of BBQ, Buffalo, or Honey Garlic sauce',11.99,4.5,'BBQ','Non-Veg',false,'https://images.unsplash.com/photo-1608039829572-9b18d7be5e17?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['BBQ Jackfruit Sandwich','Pulled jackfruit in smoky BBQ sauce on a brioche bun',11.49,4.3,'BBQ','Veg',false,'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Smoked Sausage Platter','House-smoked sausages with grilled peppers, onions, and mustard',14.49,4.4,'BBQ','Non-Veg',false,'https://images.unsplash.com/photo-1558030089-5b5e3c3c1f0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Tomato Basil Soup','Roasted tomato soup with fresh basil and a drizzle of cream',6.99,4.4,'Soups','Veg',false,'https://images.unsplash.com/photo-1547592166-23ac45744acd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['French Onion Soup','Rich beef broth with caramelized onions, topped with melted Gruyere',8.99,4.5,'Soups','Veg',false,'https://images.unsplash.com/photo-1547592166-23ac45744acd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Chicken Noodle Soup','Classic comfort soup with chicken, egg noodles, and vegetables',7.99,4.3,'Soups','Non-Veg',false,'https://images.unsplash.com/photo-1608096299210-db7e38487075?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Hot & Sour Soup','Spicy and tangy Chinese soup with tofu, mushroom, and bamboo shoots',6.49,4.2,'Soups','Veg',false,'https://images.unsplash.com/photo-1586997435126-2f2ba7e3b3c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'],
  ['Pumpkin Soup','Velvety roasted pumpkin soup with coconut milk and ginger',7.49,4.5,'Soups','Veg',true,'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80']
];

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';

async function setupDatabase() {
  try {
    console.log('Connecting to MySQL...');
    await query('SELECT 1');
    console.log('✅ MySQL connected');

    // Create tables
    for (const stmt of createTablesSQL) {
      await query(stmt);
    }
    console.log('✅ Tables created successfully!');

    // Seed categories
    await query(seedCategoriesSQL);
    console.log('✅ Categories seeded');

// Seed food items (only if empty)
    const rows = await query('SELECT COUNT(*) AS c FROM food_items');
    const foodCount = rows[0].c;
    if (foodCount === 0) {
      for (const [name, desc, price, rating, category, ftype, best, img] of foods) {
        const image = img || DEFAULT_IMG;
        await query(
          `INSERT IGNORE INTO food_items (name, description, price, image, image_url, rating, category, food_type, is_best_seller)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, desc, price, image, image, rating, category, ftype, best ? true : false]
        );
      }
      console.log(`✅ ${foods.length} food items seeded`);
    } else {
      console.log(`ℹ️ Food items already present (${foodCount}) — skipping seed`);
      // Repair: update any rows that still carry the old default image,
      // so existing deployed data gets the correct unique image per item.
      let updated = 0;
      for (const [name, desc, price, rating, category, ftype, best, img] of foods) {
        const image = img || DEFAULT_IMG;
        const r = await query(
          `UPDATE food_items SET image = ?, image_url = ? WHERE name = ? AND image = ?`,
          [image, image, name, DEFAULT_IMG]
        );
        updated += r.affectedRows || 0;
      }
      if (updated > 0) console.log(`✅ Updated ${updated} food item images to unique URLs`);
    }

    // Seed admin (bcrypt-hashed)
    const admins = await query("SELECT * FROM admins WHERE email = 'adminfoodiehub@gmail.com'");
    if (admins.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin1234', 10);
      await query(
        'INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)',
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

