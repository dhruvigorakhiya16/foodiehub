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

// =====================================================================
//  RELIABLE FOOD IMAGE URLS
//  These are the exact Unsplash image URLs that are already verified to
//  display correctly on the site (they appear in the frontend fallback
//  menu and category fallback images). Using ONLY these guarantees no
//  broken or wrong images (e.g. no random dog photos).
// =====================================================================
const IMG = {
  pizza1: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  pizza2: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  burger1: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  burger2: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  pasta1: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  pasta2: 'https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  drink: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  dessert1: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  dessert2: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  seafood: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  indian1: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  indian2: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  fallback: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
};

// Map every category to an array of guaranteed-good food images.
// Items within a category rotate through these, so the menu has visual
// variety while every image is a verified food photo (no broken/random pics).
const CATEGORY_IMG = {
  Pizza: [IMG.pizza1, IMG.pizza2],
  Burger: [IMG.burger1, IMG.burger2],
  Pasta: [IMG.pasta1, IMG.pasta2],
  Salad: [IMG.salad],
  Drinks: [IMG.drink],
  Dessert: [IMG.dessert1, IMG.dessert2],
  Chinese: [IMG.pasta2, IMG.salad],
  Indian: [IMG.indian1, IMG.indian2],
  Mexican: [IMG.burger2, IMG.pizza2],
  Breakfast: [IMG.pizza2, IMG.burger1],
  Seafood: [IMG.seafood],
  BBQ: [IMG.indian2, IMG.burger1],
  Soups: [IMG.salad]
};

// [name, description, price, rating, category, food_type, is_best_seller]
const foods = [
  ['Margherita Pizza','Classic hand-tossed pizza with fresh mozzarella, basil, and tomato sauce',12.99,4.7,'Pizza','Veg',false],
  ['Pepperoni Pizza','Loaded with pepperoni and melted cheese on a crispy crust',14.99,4.5,'Pizza','Non-Veg',true],
  ['BBQ Chicken Pizza','Tangy BBQ sauce with grilled chicken, red onions, and cilantro',15.99,4.6,'Pizza','Non-Veg',false],
  ['Veggie Supreme Pizza','Garden-fresh bell peppers, mushrooms, olives, and onions',13.49,4.4,'Pizza','Veg',false],
  ['Mushroom Truffle Pizza','Wild mushrooms, truffle oil, and melted fontina cheese',16.99,4.8,'Pizza','Veg',true],
  ['Hawaiian Pizza','Pineapple, ham, and mozzarella on a classic crust',13.99,4.3,'Pizza','Non-Veg',false],
  ['Classic Burger','Juicy beef patty with lettuce, tomato, cheese, and special sauce',11.99,4.6,'Burger','Non-Veg',false],
  ['Bacon Cheeseburger','Premium beef with crispy bacon, cheddar, and caramelized onions',14.49,4.8,'Burger','Non-Veg',true],
  ['Veggie Burger','House-made black bean patty with avocado and sprouts',10.99,4.3,'Burger','Veg',false],
  ['Mushroom Swiss Burger','Portobello mushroom with melted Swiss cheese and garlic aioli',13.99,4.5,'Burger','Veg',false],
  ['Double Cheese Burger','Two beef patties with double cheddar and secret sauce',16.99,4.7,'Burger','Non-Veg',true],
  ['Crispy Chicken Burger','Crispy fried chicken breast with slaw and spicy mayo',12.49,4.5,'Burger','Non-Veg',false],
  ['Spaghetti Carbonara','Creamy egg-based sauce with pancetta and parmesan cheese',13.99,4.4,'Pasta','Non-Veg',false],
  ['Penne Arrabbiata','Spicy tomato sauce with garlic, chili flakes, and fresh parsley',11.49,4.3,'Pasta','Veg',false],
  ['Fettuccine Alfredo','Rich and creamy parmesan sauce with fettuccine pasta',13.49,4.5,'Pasta','Veg',false],
  ['Baked Ziti','Pasta baked with ricotta, mozzarella, and marinara sauce',12.99,4.4,'Pasta','Veg',false],
  ['Pesto Genovese','Fresh basil pesto with pine nuts, cherry tomatoes, and parmesan',12.99,4.6,'Pasta','Veg',true],
  ['Lasagna Bolognese','Layers of pasta with rich meat sauce, bechamel, and cheese',15.49,4.7,'Pasta','Non-Veg',false],
  ['Greek Salad','Fresh cucumbers, tomatoes, olives, and feta cheese with vinaigrette',9.99,4.2,'Salad','Veg',false],
  ['Caesar Salad','Crisp romaine lettuce with parmesan, croutons, and classic Caesar dressing',10.49,4.5,'Salad','Veg',false],
  ['Mediterranean Salad','Cucumber, tomato, red onion, olives, and feta with lemon dressing',10.99,4.3,'Salad','Veg',false],
  ['Kale & Quinoa Bowl','Superfood kale, quinoa, roasted sweet potato, and tahini dressing',11.99,4.4,'Salad','Veg',false],
  ['Grilled Chicken Caesar','Classic Caesar with grilled chicken breast and croutons',12.99,4.6,'Salad','Non-Veg',true],
  ['Fresh Lemonade','House-made lemonade with fresh mint and a splash of soda',3.99,4.6,'Drinks','Veg',false],
  ['Mango Smoothie','Creamy mango blended with yogurt and honey',5.49,4.4,'Drinks','Veg',true],
  ['Iced Matcha Latte','Premium Japanese matcha whisked with oat milk over ice',4.99,4.5,'Drinks','Veg',false],
  ['Cold Brew Coffee','Slow-steeped 24-hour cold brew served over ice',3.99,4.4,'Drinks','Veg',false],
  ['Fresh Orange Juice','Squeezed-to-order orange juice from farm-fresh oranges',4.49,4.3,'Drinks','Veg',false],
  ['Chocolate Lava Cake','Warm chocolate cake with a molten center, served with ice cream',7.99,4.9,'Dessert','Veg',true],
  ['Tiramisu','Classic Italian coffee-flavored dessert with mascarpone cream',6.99,4.7,'Dessert','Veg',false],
  ['New York Cheesecake','Creamy classic cheesecake with berry compote',7.49,4.8,'Dessert','Veg',true],
  ['Creme Brulee','Vanilla custard with caramelized sugar top',6.99,4.6,'Dessert','Veg',false],
  ['Apple Pie','Warm apple pie with cinnamon and vanilla ice cream',6.49,4.5,'Dessert','Veg',false],
  ['Brownie Sundae','Warm chocolate brownie with vanilla ice cream and fudge sauce',7.99,4.7,'Dessert','Veg',false],
  ['Kung Pao Chicken','Spicy stir-fried chicken with peanuts, chili, and vegetables',13.99,4.5,'Chinese','Non-Veg',false],
  ['Vegetable Fried Rice','Wok-fried rice with mixed vegetables and soy sauce',9.99,4.3,'Chinese','Veg',false],
  ['Mapo Tofu','Silken tofu in spicy Sichuan chili bean sauce',11.49,4.4,'Chinese','Veg',false],
  ['Sweet & Sour Pork','Crispy battered pork with tangy sweet and sour sauce',14.49,4.6,'Chinese','Non-Veg',true],
  ['Spring Rolls (6 pcs)','Crispy rolls stuffed with vegetables, served with sweet chili dip',6.99,4.2,'Chinese','Veg',false],
  ['Butter Chicken','Tender chicken in rich creamy tomato gravy with butter naan',15.99,4.8,'Indian','Non-Veg',true],
  ['Paneer Tikka Masala','Grilled cottage cheese in spiced onion-tomato gravy',13.99,4.6,'Indian','Veg',false],
  ['Dal Makhani','Slow-cooked black lentils with cream and aromatic spices',10.99,4.5,'Indian','Veg',false],
  ['Chicken Biryani','Fragrant basmati rice layered with spiced chicken and saffron',14.99,4.7,'Indian','Non-Veg',true],
  ['Garlic Naan','Soft leavened bread brushed with garlic butter',3.49,4.4,'Indian','Veg',false],
  ['Chicken Tacos (3 pcs)','Soft corn tortillas with seasoned chicken, salsa, and guacamole',11.99,4.5,'Mexican','Non-Veg',false],
  ['Veggie Burrito','Large flour tortilla filled with rice, beans, veggies, and cheese',10.99,4.3,'Mexican','Veg',false],
  ['Nachos Supreme','Crispy tortilla chips topped with cheese, jalapenos, salsa, and sour cream',9.49,4.4,'Mexican','Veg',false],
  ['Beef Quesadilla','Grilled flour tortilla with seasoned beef, cheese, and pico de gallo',12.49,4.6,'Mexican','Non-Veg',true],
  ['Guacamole & Chips','Fresh table-side guacamole with crispy tortilla chips',7.99,4.5,'Mexican','Veg',false],
  ['Classic Pancakes','Fluffy buttermilk pancakes with maple syrup and fresh berries',8.99,4.6,'Breakfast','Veg',false],
  ['Avocado Toast','Smashed avocado on sourdough with cherry tomatoes and poached egg',10.49,4.4,'Breakfast','Veg',false],
  ['Full English Breakfast','Eggs, bacon, sausage, baked beans, toast, and grilled tomato',13.99,4.7,'Breakfast','Non-Veg',true],
  ['French Toast','Thick brioche dipped in cinnamon egg batter, topped with berries',9.99,4.5,'Breakfast','Veg',false],
  ['Omelette','Three-egg omelette with your choice of cheese, veggies, or ham',8.99,4.3,'Breakfast','Veg',false],
  ['Grilled Salmon','Atlantic salmon fillet with lemon butter sauce and seasonal vegetables',18.99,4.7,'Seafood','Non-Veg',true],
  ['Shrimp Scampi','Garlic butter shrimp served over linguine pasta',16.99,4.6,'Seafood','Non-Veg',false],
  ['Fish & Chips','Beer-battered cod with crispy fries and tartar sauce',14.49,4.4,'Seafood','Non-Veg',false],
  ['Lobster Bisque','Rich and creamy lobster soup with a hint of brandy',9.99,4.5,'Seafood','Non-Veg',false],
  ['Calamari Fritti','Crispy fried calamari rings with marinara and lemon aioli',10.99,4.3,'Seafood','Non-Veg',false],
  ['Smoked Brisket Plate','Slow-smoked beef brisket with house BBQ sauce and coleslaw',18.99,4.8,'BBQ','Non-Veg',true],
  ['BBQ Ribs (Half Rack)','Fall-off-the-bone pork ribs glazed with signature BBQ sauce',16.99,4.7,'BBQ','Non-Veg',true],
  ['Grilled Chicken Wings','Crispy wings tossed in your choice of BBQ, Buffalo, or Honey Garlic sauce',11.99,4.5,'BBQ','Non-Veg',false],
  ['BBQ Jackfruit Sandwich','Pulled jackfruit in smoky BBQ sauce on a brioche bun',11.49,4.3,'BBQ','Veg',false],
  ['Smoked Sausage Platter','House-smoked sausages with grilled peppers, onions, and mustard',14.49,4.4,'BBQ','Non-Veg',false],
  ['Tomato Basil Soup','Roasted tomato soup with fresh basil and a drizzle of cream',6.99,4.4,'Soups','Veg',false],
  ['French Onion Soup','Rich beef broth with caramelized onions, topped with melted Gruyere',8.99,4.5,'Soups','Veg',false],
  ['Chicken Noodle Soup','Classic comfort soup with chicken, egg noodles, and vegetables',7.99,4.3,'Soups','Non-Veg',false],
  ['Hot & Sour Soup','Spicy and tangy Chinese soup with tofu, mushroom, and bamboo shoots',6.49,4.2,'Soups','Veg',false],
  ['Pumpkin Soup','Velvety roasted pumpkin soup with coconut milk and ginger',7.49,4.5,'Soups','Veg',true]
];

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
    // Track rotation index per category so images vary within a category
    const catCounter = {};

    if (foodCount === 0) {
      for (const [name, desc, price, rating, category, ftype, best] of foods) {
        const imgs = CATEGORY_IMG[category] || [IMG.fallback];
        const idx = (catCounter[category] = (catCounter[category] || 0) + 1) % imgs.length;
        const image = imgs[idx];
        await query(
          `INSERT IGNORE INTO food_items (name, description, price, image, image_url, rating, category, food_type, is_best_seller)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, desc, price, image, image, rating, category, ftype, best ? true : false]
        );
      }
      console.log(`✅ ${foods.length} food items seeded`);
    } else {
      console.log(`ℹ️ Food items already present (${foodCount})`);
      // Repair: reset every food item's image to its category's guaranteed-good image.
      // This overwrites any broken/wrong images (e.g. random dog photos) with a
      // verified food photo so the menu always looks correct.
      let updated = 0;
      for (const [name, desc, price, rating, category, ftype, best] of foods) {
        const imgs = CATEGORY_IMG[category] || [IMG.fallback];
        const idx = (catCounter[category] = (catCounter[category] || 0) + 1) % imgs.length;
        const image = imgs[idx];
        const r = await query(
          `UPDATE food_items SET image = ?, image_url = ? WHERE name = ?`,
          [image, image, name]
        );
        updated += r.affectedRows || 0;
      }
      console.log(`✅ Updated images for ${updated} food items (reliable food photos)`);
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
