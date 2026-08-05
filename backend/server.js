// ============================================
// Foodie Hub - Backend Express Server (MySQL)
// Works with local XAMPP / phpMyAdmin MySQL
// ============================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, query, getConnection } = require('./db');

const app = express();

// ---- Middleware ----
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ---- Start the server (used by backend/server.js directly AND supports
// Vercel serverless via api/index.js). Auto-creates tables & seeds data
// BEFORE listening, so the API never serves requests against missing tables.
function startServer() {
  const PORT = process.env.PORT || 5000;

  (async () => {
    try {
      await query('SELECT 1');
      console.log('✅ MySQL connected');
    } catch (err) {
      console.error('❌ MySQL connection failed:');
      console.error('   message:', err && err.message);
      console.error('   code:', err && err.code);
      console.error('   Check DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in backend/.env');
    }

    const setupDatabase = require('./setup-db');
    const ok = await setupDatabase();
    if (ok) console.log('🚀 Database auto-setup completed');
    else console.error('⚠️ Database auto-setup FAILED — API will serve errors until DB is reachable.');

    app.listen(PORT, () => {
      console.log('========================================');
      console.log('  Foodie Hub Backend Server Running');
      console.log(`  http://localhost:${PORT}/api`);
      console.log('========================================');
    });
  })();
}

// Start server only when run directly
if (require.main === module) {
  startServer();
}

// Export for Vercel serverless (api/index.js)
module.exports = app;
module.exports.startServer = startServer;

// ============================================================
//                      PUBLIC ROUTES
// ============================================================

// ---- Get all food items ----
app.get('/api/foods', async (req, res) => {
  try {
    const result = await query(
      `SELECT f.id,
              f.id AS food_id,
              f.name AS food_name,
              f.description,
              f.price,
              f.image,
              f.image_url,
              f.rating,
              f.food_type,
              f.is_best_seller,
              f.category AS category_name,
              f.category_id
       FROM food_items f
       ORDER BY f.id ASC`
    );
    res.json(result);
  } catch (err) {
    console.error('GET /api/foods error:', err.message);
    res.status(500).json({ message: 'Failed to load foods', error: err.message });
  }
});

// ---- Get all categories ----
app.get('/api/categories', async (req, res) => {
  try {
    const result = await query(
      `SELECT id AS category_id, category_name, emoji, description FROM categories ORDER BY id ASC`
    );
    res.json(result);
  } catch (err) {
    console.error('GET /api/categories error:', err.message);
    res.status(500).json({ message: 'Failed to load categories', error: err.message });
  }
});

// ---- Register a new user ----
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, phone_no, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered. Please login.' });
    }

    const hashedPassword = bcrypt.hashSync(String(password), 10);
    const result = await query(
      'INSERT INTO users (name, email, password, phone_no, address) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone_no || null, address || null]
    );
    res.status(201).json({ message: 'Registration successful', user_id: result.insertId });
  } catch (err) {
    console.error('POST /api/register error:', err.message);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// ---- Login (user + admin) ----
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check admin first
    const admins = await query('SELECT * FROM admins WHERE email = ?', [email]);
    if (admins.length > 0) {
      const admin = admins[0];
      const match = bcrypt.compareSync(String(password), admin.password);
      if (match) {
        return res.json({
          role: 'admin',
          message: 'Admin login successful',
          admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role || 'admin'
          }
        });
      }
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Check user
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'No account found with this email' });
    }
    const user = users[0];
    const match = bcrypt.compareSync(String(password), user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({
      role: 'user',
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_no: user.phone_no,
        address: user.address
      }
    });
  } catch (err) {
    console.error('POST /api/login error:', err.message);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// ---- Add item to cart (server sync) ----
app.post('/api/cart', async (req, res) => {
  try {
    const { food_id, price, quantity, user_id } = req.body;
    const qty = quantity || 1;
    const total = parseFloat(parseFloat(price).toFixed(2)) * qty;

    // Check if item already in cart for this user
    if (user_id) {
      const existing = await query(
        'SELECT * FROM cart WHERE user_id = ? AND food_id = ?',
        [user_id, food_id]
      );
      if (existing.length > 0) {
        const newQty = existing[0].quantity + qty;
        await query(
          'UPDATE cart SET quantity = ?, total = ? WHERE id = ?',
          [newQty, parseFloat((parseFloat(price) * newQty).toFixed(2)), existing[0].id]
        );
        return res.json({ message: 'Cart updated', cart_id: existing[0].id });
      }
    }

    const result = await query(
      'INSERT INTO cart (user_id, food_id, quantity, price, total) VALUES (?, ?, ?, ?, ?)',
      [user_id || null, food_id, qty, parseFloat(parseFloat(price).toFixed(2)), total]
    );
    res.status(201).json({ message: 'Item added to cart', cart_id: result.insertId });
  } catch (err) {
    console.error('POST /api/cart error:', err.message);
    res.status(500).json({ message: 'Failed to add to cart', error: err.message });
  }
});

// ---- Create an order ----
app.post('/api/orders', async (req, res) => {
  const client = await getConnection();
  try {
    const {
      customer_name, email, phone, address, payment_method,
      items, user_id
    } = req.body;

    if (!customer_name || !phone || !items || items.length === 0) {
      return res.status(400).json({ message: 'Customer name, phone, and items are required' });
    }

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      subtotal += parseFloat(parseFloat(item.price).toFixed(2)) * (item.quantity || 1);
    });
    subtotal = parseFloat(subtotal.toFixed(2));
    const tax = parseFloat((subtotal * 0.05).toFixed(2));
    const delivery_fee = subtotal > 0 ? 40 : 0;
    const total_amount = parseFloat((subtotal + tax + delivery_fee).toFixed(2));

    const payMethod = payment_method || 'cod';

    await client.beginTransaction();

    // Insert order
    const orderResult = await new Promise((resolve, reject) => {
      client.query(
        `INSERT INTO orders (user_id, customer_name, email, phone, address, subtotal, tax, delivery_fee, total_amount, payment_method, item_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id || null, customer_name, email || null, phone, address || null, subtotal, tax, delivery_fee, total_amount, payMethod, items.length],
        (err, result) => (err ? reject(err) : resolve(result))
      );
    });
    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      const itemSubtotal = parseFloat((parseFloat(item.price) * (item.quantity || 1)).toFixed(2));
      await new Promise((resolve, reject) => {
        client.query(
          `INSERT INTO order_items (order_id, food_item_id, item_name, quantity, price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.food_item_id || null, item.item_name, item.quantity || 1, parseFloat(parseFloat(item.price).toFixed(2)), itemSubtotal],
          (err, result) => (err ? reject(err) : resolve(result))
        );
      });
    }

    // Clear user's synced cart for this order
    if (user_id) {
      await new Promise((resolve, reject) => {
        client.query('DELETE FROM cart WHERE user_id = ?', [user_id], (err, r) => (err ? reject(err) : resolve(r)));
      });
    }

    await client.commit();
    res.status(201).json({ message: 'Order placed successfully', order_id: orderId, total_amount });
  } catch (err) {
    try { await client.rollback(); } catch (e) {}
    console.error('POST /api/orders error:', err.message);
    res.status(500).json({ message: 'Failed to place order', error: err.message });
  } finally {
    client.release();
  }
});

// ---- Get orders for a user ----
app.get('/api/orders', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }
    const result = await query(
      `SELECT o.*,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [user_id]
    );
    res.json(result);
  } catch (err) {
    console.error('GET /api/orders error:', err.message);
    res.status(500).json({ message: 'Failed to load orders', error: err.message });
  }
});

// ---- Get a single order with items ----
app.get('/api/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const orders = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const items = await query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    res.json({ order: orders[0], items: items });
  } catch (err) {
    console.error('GET /api/orders/:id error:', err.message);
    res.status(500).json({ message: 'Failed to load order', error: err.message });
  }
});

// ---- Create a reservation ----
app.post('/api/reservations', async (req, res) => {
  try {
    const { name, email, phone, res_date, res_time, guests, message } = req.body;
    if (!name || !phone || !res_date || !res_time || !guests) {
      return res.status(400).json({ message: 'Name, phone, date, time, and guests are required' });
    }
    const result = await query(
      'INSERT INTO reservations (name, email, phone, res_date, res_time, guests, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email || null, phone, res_date, res_time, guests, message || null]
    );
    res.status(201).json({ message: 'Reservation booked successfully', reservation_id: result.insertId });
  } catch (err) {
    console.error('POST /api/reservations error:', err.message);
    res.status(500).json({ message: 'Reservation failed', error: err.message });
  }
});

// ---- Contact form ----
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const result = await query(
      'INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name, email, subject, message]
    );
    res.status(201).json({ message: 'Message sent successfully', contact_id: result.insertId });
  } catch (err) {
    console.error('POST /api/contact error:', err.message);
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

// ============================================================
//                      USER PROFILE ROUTES
// ============================================================

// ---- Get user profile ----
app.get('/api/user/profile/:id', async (req, res) => {
  try {
    const users = await query(
      'SELECT id, name, email, phone_no, address, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(users[0]);
  } catch (err) {
    console.error('GET /api/user/profile/:id error:', err.message);
    res.status(500).json({ message: 'Failed to load profile', error: err.message });
  }
});

// ---- Update user profile ----
app.put('/api/user/profile/:id', async (req, res) => {
  try {
    const { name, email, phone_no, address } = req.body;
    if (!name || !email || !phone_no) {
      return res.status(400).json({ message: 'Name, email, and phone are required' });
    }
    await query(
      'UPDATE users SET name = ?, email = ?, phone_no = ?, address = ? WHERE id = ?',
      [name, email, phone_no, address || null, req.params.id]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('PUT /api/user/profile/:id error:', err.message);
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
});

// ---- Change user password ----
app.put('/api/user/password/:id', async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const users = await query('SELECT password FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const match = bcrypt.compareSync(String(current_password), users[0].password);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    const hashedPassword = bcrypt.hashSync(String(new_password), 10);
    await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('PUT /api/user/password/:id error:', err.message);
    res.status(500).json({ message: 'Failed to update password', error: err.message });
  }
});

// ============================================================
//                    ADMIN ROUTES
// ============================================================

// ---- Admin middleware (verify session headers) ----
function adminAuth(req, res, next) {
  const email = req.headers['x-admin-email'];
  const id = req.headers['x-admin-id'];
  if (!email || !id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  // Verify admin exists
  query('SELECT * FROM admins WHERE id = ? AND email = ?', [id, email])
    .then(result => {
      if (result.length === 0) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      req.admin = result[0];
      next();
    })
    .catch(err => res.status(500).json({ message: 'Auth error', error: err.message }));
}

// ---- Admin login ----
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admins = await query('SELECT * FROM admins WHERE email = ?', [email]);
    if (admins.length === 0) {
      return res.status(401).json({ message: 'Admin not found' });
    }
    const match = bcrypt.compareSync(String(password), admins[0].password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }
    res.json({
      message: 'Admin login successful',
      admin: { id: admins[0].id, name: admins[0].name, email: admins[0].email, role: admins[0].role || 'admin' }
    });
  } catch (err) {
    console.error('POST /api/admin/login error:', err.message);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// ---- Get current admin ----
app.get('/api/admin/me', adminAuth, (req, res) => {
  res.json({ admin: { id: req.admin.id, name: req.admin.name, email: req.admin.email, role: req.admin.role || 'admin' } });
});

// ---- Get all orders (admin) ----
app.get('/api/admin/orders', adminAuth, async (req, res) => {
  try {
    const orders = await query(
      `SELECT o.*,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       ORDER BY o.created_at DESC`
    );
    res.json(orders);
  } catch (err) {
    console.error('GET /api/admin/orders error:', err.message);
    res.status(500).json({ message: 'Failed to load orders', error: err.message });
  }
});

// ---- Update order status ----
app.put('/api/admin/orders/:id/status', adminAuth, async (req, res) => {
  try {
    const { order_status } = req.body;
    const valid = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!order_status || !valid.includes(order_status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }
    await query('UPDATE orders SET order_status = ? WHERE id = ?', [order_status, req.params.id]);
    res.json({ message: 'Order status updated successfully' });
  } catch (err) {
    console.error('PUT /api/admin/orders/:id/status error:', err.message);
    res.status(500).json({ message: 'Failed to update order status', error: err.message });
  }
});

// ---- Get all users (admin) ----
app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const users = await query('SELECT id, name, email, phone_no, address, created_at FROM users ORDER BY id DESC');
    res.json(users);
  } catch (err) {
    console.error('GET /api/admin/users error:', err.message);
    res.status(500).json({ message: 'Failed to load users', error: err.message });
  }
});

// ---- Get all reservations (admin) ----
app.get('/api/admin/reservations', adminAuth, async (req, res) => {
  try {
    const reservations = await query('SELECT * FROM reservations ORDER BY created_at DESC');
    res.json(reservations);
  } catch (err) {
    console.error('GET /api/admin/reservations error:', err.message);
    res.status(500).json({ message: 'Failed to load reservations', error: err.message });
  }
});

// ---- Get all contacts (admin) ----
app.get('/api/admin/contacts', adminAuth, async (req, res) => {
  try {
    const contacts = await query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json(contacts);
  } catch (err) {
    console.error('GET /api/admin/contacts error:', err.message);
    res.status(500).json({ message: 'Failed to load contacts', error: err.message });
  }
});

// ---- Add a food item (admin) ----
app.post('/api/admin/foods', adminAuth, async (req, res) => {
  try {
    const { name, price, category, food_type, description, image_url, rating, is_best_seller } = req.body;
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }
    const catName = category || 'General';
    // Find or create category
    let cats = await query('SELECT id FROM categories WHERE category_name = ?', [catName]);
    let catId = null;
    if (cats.length > 0) {
      catId = cats[0].id;
    } else {
      const r = await query('INSERT INTO categories (category_name) VALUES (?)', [catName]);
      catId = r.insertId;
    }
    const defaultImg = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
    const result = await query(
      `INSERT INTO food_items (name, description, price, image_url, image, rating, category, category_id, food_type, is_best_seller)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        parseFloat(parseFloat(price).toFixed(2)),
        image_url || defaultImg,
        image_url || defaultImg,
        rating || 4.5,
        catName,
        catId,
        food_type || 'Veg',
        is_best_seller ? true : false
      ]
    );
    res.status(201).json({ message: 'Food item added successfully', food_id: result.insertId });
  } catch (err) {
    console.error('POST /api/admin/foods error:', err.message);
    res.status(500).json({ message: 'Failed to add food item', error: err.message });
  }
});

// ---- Update a food item (admin) ----
app.put('/api/admin/foods/:id', adminAuth, async (req, res) => {
  try {
    const { name, price, category, food_type, description, image_url, rating, is_best_seller } = req.body;
    const catName = category || 'General';
    // Find or create category
    let cats = await query('SELECT id FROM categories WHERE category_name = ?', [catName]);
    let catId = null;
    if (cats.length > 0) {
      catId = cats[0].id;
    } else {
      const r = await query('INSERT INTO categories (category_name) VALUES (?)', [catName]);
      catId = r.insertId;
    }
    await query(
      `UPDATE food_items
       SET name = ?, description = ?, price = ?, category = ?, category_id = ?, food_type = ?, rating = ?, is_best_seller = ?
       WHERE id = ?`,
      [
        name || '',
        description || '',
        parseFloat(parseFloat(price).toFixed(2)),
        catName,
        catId,
        food_type || 'Veg',
        rating || 4.5,
        is_best_seller ? true : false,
        req.params.id
      ]
    );
    res.json({ message: 'Food item updated successfully' });
  } catch (err) {
    console.error('PUT /api/admin/foods/:id error:', err.message);
    res.status(500).json({ message: 'Failed to update food item', error: err.message });
  }
});

// ---- Delete a food item (admin) ----
app.delete('/api/admin/foods/:id', adminAuth, async (req, res) => {
  try {
    await query('DELETE FROM food_items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Food item deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/admin/foods/:id error:', err.message);
    res.status(500).json({ message: 'Failed to delete food item', error: err.message });
  }
});

// ---- Add a category (admin) ----
app.post('/api/admin/categories', adminAuth, async (req, res) => {
  try {
    const { category_name } = req.body;
    if (!category_name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    const result = await query('INSERT INTO categories (category_name) VALUES (?)', [category_name]);
    res.status(201).json({ message: 'Category added successfully', category_id: result.insertId });
  } catch (err) {
    console.error('POST /api/admin/categories error:', err.message);
    if (err.errno === 1062) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    res.status(500).json({ message: 'Failed to add category', error: err.message });
  }
});

// ---- Delete a category (admin) ----
app.delete('/api/admin/categories/:id', adminAuth, async (req, res) => {
  try {
    await query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/admin/categories/:id error:', err.message);
    res.status(500).json({ message: 'Failed to delete category', error: err.message });
  }
});

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---- DB diagnostic (returns actual error + connection config to debug 500s) ----
app.get('/api/debugdb', async (req, res) => {
  const info = {
    env: {
      DB_HOST: process.env.DB_HOST || '(unset)',
      DB_PORT: process.env.DB_PORT || '(unset)',
      DB_USER: process.env.DB_USER || '(unset)',
      DB_NAME: process.env.DB_NAME || '(unset)',
      NODE_ENV: process.env.NODE_ENV || '(unset)',
    },
    steps: {}
  };
  const { pool: dbPool } = require('./db');
  const cfg = dbPool.config;
  info.connectionConfig = {
    host: cfg.connectionConfig.host,
    port: cfg.connectionConfig.port,
    user: cfg.connectionConfig.user,
    database: cfg.connectionConfig.database,
  };
  try {
    await query('SELECT 1');
    info.steps.connection = 'ok';
  } catch (err) {
    info.steps.connection = 'FAILED';
    info.steps.connectionError = (err && err.message) || String(err);
    info.steps.connectionCode = err && err.code;
  }
  try {
    const r = await query('SELECT COUNT(*) AS c FROM food_items');
    info.steps.foodCount = r[0].c;
  } catch (err) {
    info.steps.food_items = 'FAILED';
    info.steps.foodItemsError = (err && err.message) || String(err);
    info.steps.foodItemsCode = err && err.code;
  }
  try {
    const setupDatabase = require('./setup-db');
    const ok = await setupDatabase();
    info.steps.setupDatabase = ok ? 'ok' : 'FAILED';
  } catch (err) {
    info.steps.setupDatabase = 'THREW';
    info.steps.setupError = (err && err.message) || String(err);
  }
  try {
    const r = await query('SELECT COUNT(*) AS c FROM food_items');
    info.steps.foodCountAfter = r[0].c;
  } catch (err) {
    info.steps.foodCountAfter = 'FAILED';
    info.steps.foodCountAfterError = (err && err.message) || String(err);
  }
  res.json(info);
});

// ============================================================
//            STATIC FRONTEND SERVING (for Render all-in-one)
// Placed AFTER the API routes so they take priority.
// ============================================================
const PROJECT_ROOT = path.join(__dirname, '..');
app.use(express.static(PROJECT_ROOT, {
  index: 'index.html',
  extensions: ['html']
}));

// ---- 404 fallback for unknown API routes ----
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Export for use in Vercel serverless (api/index.js)
module.exports = app;
