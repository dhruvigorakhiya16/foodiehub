const mysql = require('mysql2');
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) { console.error('Connection failed:', err.message); process.exit(1); }
  console.log('Connected to MySQL - Seeding...\n');

  // ====================================================================
  // First, get existing category names to find their category_ids
  // ====================================================================
  db.query('SELECT category_id, category_name FROM categories', (err, existingCats) => {
    if (err) { console.error('Error fetching categories:', err.message); db.end(); return; }

    const catMap = {};
    existingCats.forEach(c => { catMap[c.category_name] = c.category_id; });

    // ====================================================================
    // Insert NEW categories (only if they don't exist already)
    // ====================================================================
    const newCats = [
      ['Pasta', 'pasta.jpg'],
      ['Salad', 'salad.jpg'],
      ['Dessert', 'dessert.jpg'],
      ['Chinese', 'chinese.jpg'],
      ['Indian', 'indian.jpg'],
      ['Mexican', 'mexican.jpg'],
      ['Sandwich', 'sandwich.jpg'],
      ['Seafood', 'seafood.jpg'],
      ['Breakfast', 'breakfast.jpg'],
      ['Sushi', 'sushi.jpg'],
      ['BBQ', 'bbq.jpg'],
      ['Italian', 'italian.jpg'],
      ['Soups', 'soups.jpg'],
    ];

    const catInsertQueries = [];
    for (const [cname, cimg] of newCats) {
      if (!catMap[cname]) {
        catInsertQueries.push(`INSERT INTO categories (category_name, category_image) VALUES ('${cname}', '${cimg}')`);
      }
    }

    // ====================================================================
    // Food items data (74 new items across 16 categories)
    // [food_name, description, price, image_url, rating, category_name, food_type, is_best_seller]
    // ====================================================================
    const foods = [
      // === PIZZA (existing: Margherita, Pepperoni — adding 4) ===
      ['BBQ Chicken Pizza', 'Tangy BBQ sauce with grilled chicken, red onions, and cilantro', 15.99, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Pizza', 'Non-Veg', true],
      ['Veggie Supreme Pizza', 'Garden-fresh bell peppers, mushrooms, olives, and onions', 13.49, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Pizza', 'Veg', false],
      ['Mushroom Truffle Pizza', 'Wild mushrooms, truffle oil, and melted fontina cheese', 16.99, 'https://images.unsplash.com/photo-1458642849426-cfb724f15ef7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.8, 'Pizza', 'Veg', true],
      ['Hawaiian Pizza', 'Pineapple, ham, and mozzarella on a classic crust', 13.99, 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Pizza', 'Non-Veg', false],

      // === BURGER (existing: Classic Burger, Bacon Cheeseburger — adding 4) ===
      ['Veggie Burger', 'House-made black bean patty with avocado and sprouts', 10.99, 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Burger', 'Veg', false],
      ['Mushroom Swiss Burger', 'Portobello mushroom with melted Swiss cheese and garlic aioli', 13.99, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Burger', 'Veg', false],
      ['Double Cheese Burger', 'Two beef patties with double cheddar and secret sauce', 16.99, 'https://images.unsplash.com/photo-1586816001966-79b736744398?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Burger', 'Non-Veg', true],
      ['Crispy Chicken Burger', 'Crispy fried chicken breast with slaw and spicy mayo', 12.49, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Burger', 'Non-Veg', false],

      // === DRINKS (existing: Fresh Lemonade, Mango Smoothie — adding 4) ===
      ['Iced Matcha Latte', 'Premium Japanese matcha whisked with oat milk over ice', 4.99, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Drinks', 'Veg', false],
      ['Berry Smoothie Bowl', 'Thick berry smoothie topped with granola, banana, and chia seeds', 6.99, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Drinks', 'Veg', true],
      ['Cold Brew Coffee', 'Slow-steeped 24-hour cold brew served over ice', 3.99, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Drinks', 'Veg', false],
      ['Fresh Orange Juice', 'Squeezed-to-order orange juice from farm-fresh oranges', 4.49, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Drinks', 'Veg', false],

      // === PASTA (existing: Spaghetti Carbonara, Penne Arrabbiata — adding 4) ===
      ['Fettuccine Alfredo', 'Rich and creamy parmesan sauce with fettuccine pasta', 13.49, 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Pasta', 'Veg', false],
      ['Baked Ziti', 'Pasta baked with ricotta, mozzarella, and marinara sauce', 12.99, 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Pasta', 'Veg', false],
      ['Pesto Genovese', 'Fresh basil pesto with pine nuts, cherry tomatoes, and parmesan', 12.99, 'https://images.unsplash.com/photo-1612874742237-6526221588e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Pasta', 'Veg', true],
      ['Lasagna Bolognese', 'Layers of pasta with rich meat sauce, bechamel, and cheese', 15.49, 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Pasta', 'Non-Veg', false],

      // === SALAD (existing: Greek Salad, Caesar Salad — adding 4) ===
      ['Mediterranean Salad', 'Cucumber, tomato, red onion, olives, and feta with lemon dressing', 10.99, 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Salad', 'Veg', false],
      ['Kale & Quinoa Bowl', 'Superfood kale, quinoa, roasted sweet potato, and tahini dressing', 11.99, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Salad', 'Veg', false],
      ['Grilled Chicken Caesar', 'Classic Caesar with grilled chicken breast and croutons', 12.99, 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Salad', 'Non-Veg', true],
      ['Asian Sesame Salad', 'Mixed greens with edamame, crispy wontons, and sesame ginger dressing', 10.49, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.2, 'Salad', 'Veg', false],

      // === DESSERT (existing: Chocolate Lava Cake, Tiramisu — adding 4) ===
      ['New York Cheesecake', 'Creamy classic cheesecake with berry compote', 7.49, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.8, 'Dessert', 'Veg', true],
      ['Creme Brulee', 'Vanilla custard with caramelized sugar top', 6.99, 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Dessert', 'Veg', false],
      ['Apple Pie', 'Warm apple pie with cinnamon and vanilla ice cream', 6.49, 'https://images.unsplash.com/photo-1621743478912-cc8a86d7e8b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Dessert', 'Veg', false],
      ['Brownie Sundae', 'Warm chocolate brownie with vanilla ice cream and fudge sauce', 7.99, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Dessert', 'Veg', false],

      // === CHINESE (5 items) ===
      ['Kung Pao Chicken', 'Spicy stir-fried chicken with peanuts, chili, and vegetables', 13.99, 'https://images.unsplash.com/photo-1525755662778-989d0524087e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Chinese', 'Non-Veg', false],
      ['Vegetable Fried Rice', 'Wok-fried rice with mixed vegetables, egg, and soy sauce', 9.99, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Chinese', 'Veg', false],
      ['Mapo Tofu', 'Silken tofu in spicy Sichuan chili bean sauce', 11.49, 'https://images.unsplash.com/photo-1582452919408-aca1e7ec5c0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Chinese', 'Veg', false],
      ['Sweet & Sour Pork', 'Crispy battered pork with tangy sweet and sour sauce', 14.49, 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Chinese', 'Non-Veg', true],
      ['Spring Rolls (6 pcs)', 'Crispy rolls stuffed with vegetables, served with sweet chili dip', 6.99, 'https://images.unsplash.com/photo-1583471726578-c10237645e62?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.2, 'Chinese', 'Veg', false],

      // === INDIAN (5 items) ===
      ['Butter Chicken', 'Tender chicken in rich creamy tomato gravy with butter naan', 15.99, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.8, 'Indian', 'Non-Veg', true],
      ['Paneer Tikka Masala', 'Grilled cottage cheese in spiced onion-tomato gravy', 13.99, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Indian', 'Veg', false],
      ['Dal Makhani', 'Slow-cooked black lentils with cream and aromatic spices', 10.99, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Indian', 'Veg', false],
      ['Chicken Biryani', 'Fragrant basmati rice layered with spiced chicken and saffron', 14.99, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Indian', 'Non-Veg', true],
      ['Garlic Naan', 'Soft leavened bread brushed with garlic butter', 3.49, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Indian', 'Veg', false],

      // === MEXICAN (5 items) ===
      ['Chicken Tacos (3 pcs)', 'Soft corn tortillas with seasoned chicken, salsa, and guacamole', 11.99, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Mexican', 'Non-Veg', false],
      ['Veggie Burrito', 'Large flour tortilla filled with rice, beans, veggies, and cheese', 10.99, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Mexican', 'Veg', false],
      ['Nachos Supreme', 'Crispy tortilla chips topped with cheese, jalapenos, salsa, and sour cream', 9.49, 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Mexican', 'Veg', false],
      ['Beef Quesadilla', 'Grilled flour tortilla with seasoned beef, cheese, and pico de gallo', 12.49, 'https://images.unsplash.com/photo-1618040996337-56904b7850b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Mexican', 'Non-Veg', true],
      ['Guacamole & Chips', 'Fresh table-side guacamole with crispy tortilla chips', 7.99, 'https://images.unsplash.com/photo-1600335895229-6e755c92e0e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Mexican', 'Veg', false],

      // === SANDWICH (5 items) ===
      ['Grilled Chicken Panini', 'Pressed panini with grilled chicken, pesto, mozzarella, and sun-dried tomatoes', 11.99, 'https://images.unsplash.com/photo-1621857090863-d0efb61f402d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Sandwich', 'Non-Veg', false],
      ['Club Sandwich', 'Triple-decker with turkey, bacon, lettuce, tomato, and mayo', 10.99, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Sandwich', 'Non-Veg', false],
      ['Caprese Sandwich', 'Fresh mozzarella, tomato, basil, and balsamic glaze on ciabatta', 9.99, 'https://images.unsplash.com/photo-1540713434306-58505cf1b6fc?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Sandwich', 'Veg', false],
      ['Philly Cheesesteak', 'Thinly sliced ribeye with melted provolone, peppers, and onions', 13.99, 'https://images.unsplash.com/photo-1554520735-32a3115dabde?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Sandwich', 'Non-Veg', true],
      ['Veggie Wrap', 'Hummus, roasted veggies, spinach, and feta in a whole wheat wrap', 9.49, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.2, 'Sandwich', 'Veg', false],

      // === SEAFOOD (5 items) ===
      ['Grilled Salmon', 'Atlantic salmon fillet with lemon butter sauce and seasonal vegetables', 18.99, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Seafood', 'Non-Veg', true],
      ['Shrimp Scampi', 'Garlic butter shrimp served over linguine pasta', 16.99, 'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Seafood', 'Non-Veg', false],
      ['Fish & Chips', 'Beer-battered cod with crispy fries and tartar sauce', 14.49, 'https://images.unsplash.com/photo-1579214297307-c36a17496a1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Seafood', 'Non-Veg', false],
      ['Lobster Bisque', 'Rich and creamy lobster soup with a hint of brandy', 9.99, 'https://images.unsplash.com/photo-1594756202469-9ff9799b2e4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Seafood', 'Non-Veg', false],
      ['Calamari Fritti', 'Crispy fried calamari rings with marinara and lemon aioli', 10.99, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Seafood', 'Non-Veg', false],

      // === BREAKFAST (5 items) ===
      ['Classic Pancakes', 'Fluffy buttermilk pancakes with maple syrup and fresh berries', 8.99, 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Breakfast', 'Veg', false],
      ['Avocado Toast', 'Smashed avocado on sourdough with cherry tomatoes and poached egg', 10.49, 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Breakfast', 'Veg', false],
      ['Full English Breakfast', 'Eggs, bacon, sausage, baked beans, toast, and grilled tomato', 13.99, 'https://images.unsplash.com/photo-1603046891744-1f76eb10d0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Breakfast', 'Non-Veg', true],
      ['French Toast', 'Thick brioche dipped in cinnamon egg batter, topped with berries', 9.99, 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Breakfast', 'Veg', false],
      ['Omelette', 'Three-egg omelette with your choice of cheese, veggies, or ham', 8.99, 'https://images.unsplash.com/photo-1510693206972-df098062cb71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Breakfast', 'Veg', false],

      // === SUSHI (5 items) ===
      ['California Roll (8 pcs)', 'Crab, avocado, and cucumber wrapped in seasoned rice and seaweed', 10.99, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Sushi', 'Non-Veg', false],
      ['Salmon Nigiri (4 pcs)', 'Fresh Atlantic salmon slices over hand-pressed sushi rice', 12.99, 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Sushi', 'Non-Veg', false],
      ['Dragon Roll (8 pcs)', 'Shrimp tempura, cucumber, topped with avocado and eel sauce', 14.99, 'https://images.unsplash.com/photo-1557246565-8a3d3ab5d7f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Sushi', 'Non-Veg', true],
      ['Vegetable Maki (6 pcs)', 'Cucumber, avocado, and carrot rolled with sesame seeds', 7.99, 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.2, 'Sushi', 'Veg', false],
      ['Tuna Sashimi (6 pcs)', 'Premium grade raw tuna sliced thin, served with soy and wasabi', 15.99, 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.8, 'Sushi', 'Non-Veg', true],

      // === BBQ (5 items) ===
      ['Smoked Brisket Plate', 'Slow-smoked beef brisket with house BBQ sauce and coleslaw', 18.99, 'https://images.unsplash.com/photo-1558030089-5b5e3c3c1f0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.8, 'BBQ', 'Non-Veg', true],
      ['BBQ Ribs (Half Rack)', 'Fall-off-the-bone pork ribs glazed with signature BBQ sauce', 16.99, 'https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'BBQ', 'Non-Veg', true],
      ['Grilled Chicken Wings', 'Crispy wings tossed in your choice of sauce: BBQ, Buffalo, or Honey Garlic', 11.99, 'https://images.unsplash.com/photo-1608039829572-9b18d7be5e17?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'BBQ', 'Non-Veg', false],
      ['BBQ Jackfruit Sandwich', 'Pulled jackfruit in smoky BBQ sauce on a brioche bun', 11.49, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'BBQ', 'Veg', false],
      ['Smoked Sausage Platter', 'House-smoked sausages with grilled peppers, onions, and mustard', 14.49, 'https://images.unsplash.com/photo-1558030089-5b5e3c3c1f0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'BBQ', 'Non-Veg', false],

      // === ITALIAN (5 items) ===
      ['Bruschetta', 'Toasted ciabatta with fresh tomato, basil, garlic, and olive oil', 7.99, 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Italian', 'Veg', false],
      ['Risotto ai Funghi', 'Creamy arborio rice with wild mushrooms and parmesan', 14.99, 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.6, 'Italian', 'Veg', false],
      ['Chicken Parmigiana', 'Breaded chicken cutlet with marinara, mozzarella, and spaghetti', 15.99, 'https://images.unsplash.com/photo-1632778149955-e80d8ce7921b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Italian', 'Non-Veg', false],
      ['Margherita Flatbread', 'Thin crispy flatbread with tomato, mozzarella, and fresh basil', 10.99, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Italian', 'Veg', false],
      ['Classic Tiramisu', 'Traditional Italian coffee-soaked ladyfingers with mascarpone cream', 6.99, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.7, 'Italian', 'Veg', true],

      // === SOUPS (5 items) ===
      ['Tomato Basil Soup', 'Roasted tomato soup with fresh basil and a drizzle of cream', 6.99, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.4, 'Soups', 'Veg', false],
      ['French Onion Soup', 'Rich beef broth with caramelized onions, topped with melted Gruyere', 8.99, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Soups', 'Veg', false],
      ['Chicken Noodle Soup', 'Classic comfort soup with chicken, egg noodles, and vegetables', 7.99, 'https://images.unsplash.com/photo-1608096299210-db7e38487075?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.3, 'Soups', 'Non-Veg', false],
      ['Hot & Sour Soup', 'Spicy and tangy Chinese soup with tofu, mushroom, and bamboo shoots', 6.49, 'https://images.unsplash.com/photo-1586997435126-2f2ba7e3b3c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.2, 'Soups', 'Veg', false],
      ['Pumpkin Soup', 'Velvety roasted pumpkin soup with coconut milk and ginger', 7.49, 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', 4.5, 'Soups', 'Veg', true],
    ];

    // ====================================================================
    // Execute all queries
    // ====================================================================
    let queries = [];

    // First insert categories
    for (const q of catInsertQueries) {
      queries.push({ type: 'category', sql: q });
    }

    // Then insert food items with correct category_id
    for (const f of foods) {
      const [fname, desc, price, img, rating, catName, ftype, best] = f;
      const catId = catMap[catName];
      if (!catId) {
        console.log(`  SKIP: Category "${catName}" not found for "${fname}"`);
        continue;
      }
      const safeName = fname.replace(/'/g, "\\'");
      const safeDesc = desc.replace(/'/g, "\\'");
      const sql = `INSERT INTO food_items (category_id, food_name, description, price, image, rating, food_type, is_best_seller) VALUES (${catId}, '${safeName}', '${safeDesc}', ${price}, '${img}', ${rating}, '${ftype}', ${best ? 1 : 0})`;
      queries.push({ type: 'food', name: fname, sql });
    }

    // Run sequentially
    let idx = 0;
    function runNext() {
      if (idx >= queries.length) {
        console.log('\n========================================');
        console.log('  ✅ ALL ITEMS SEEDED SUCCESSFULLY!');
        console.log('  Categories added: ' + catInsertQueries.length);
        console.log('  Food items added: ' + foods.length);
        console.log('========================================');
        db.end();
        return;
      }
      const q = queries[idx];
      db.query(q.sql, (err, result) => {
        if (err) {
          if (err.errno === 1062) {
            console.log('  SKIP (duplicate): ' + (q.name || q.sql.substring(0, 50)));
          } else {
            console.log('  ERROR: ' + err.message + ' -> ' + q.sql.substring(0, 80));
          }
        } else {
          if (q.type === 'category') console.log('  ✅ Category: ' + q.sql.substring(30, 60));
          else console.log('  ✅ ' + q.name);
        }
        idx++;
        runNext();
      });
    }
    runNext();
  });
});
