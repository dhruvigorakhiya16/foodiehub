// ============================================
// Foodie Hub - Backend Express Server (PostgreSQL)
// Works locally, on Vercel, and on Render
// ============================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, query } = require('./db');

const app = express();

// ---- Middleware ----
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ---- Start server only when run directly ----
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  // Auto-create tables & seed data BEFORE listening, so the API never
  // serves requests against missing tables (no manual shell step on Render).
  (async () => {
    try {
      await query('SELECT 1');
      console.log('✅ PostgreSQL connected');
    } catch (err) {
      console.error('❌ PostgreSQL connection failed:');
      console.error('   message:', err && err.message);
      console.error('   code:', err && err.code);
      console.error('   detail:', err && err.detail);
      console.error('   stack:', err && err.stack);
      console.error('   DATABASE_URL set:', !!process.env.DATABASE_URL);
      console.error('   DB_HOST set:', !!process.env.DB_HOST);
      console.error('   Check your DATABASE_URL / DB_* env vars in backend/.env');
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

// Export for use in Vercel serverless (api/index.js)
module.exports = app;

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
    res.json(result.rows);
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
    res.json(result.rows);
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
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered. Please login.' });
    }

    const hashedPassword = bcrypt.hashSync(String(password), 10);
    const result = await query(
      'INSERT INTO users (name, email, password, phone_no, address) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, email, hashedPassword, phone_no || null, address || null]
    );
    res.status(201).json({ message: 'Registration successful', user_id: result.rows[0].id });
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
    const admins = await query('SELECT * FROM admins WHERE email = $1', [email]);
    if (admins.rows.length > 0) {
      const admin = admins.rows[0];
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
    const users = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (users.rows.length === 0) {
      return res.status(401).json({ message: 'No account found with this email' });
    }
    const user = users.rows[0];
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
        'SELECT * FROM cart WHERE user_id = $1 AND food_id = $2',
        [user_id, food_id]
      );
      if (existing.rows.length > 0) {
        const newQty = existing.rows[0].quantity + qty;
        await query(
          'UPDATE cart SET quantity = $1, total = $2 WHERE id = $3',
          [newQty, parseFloat((parseFloat(price) * newQty).toFixed(2)), existing.rows[0].id]
        );
        return res.json({ message: 'Cart updated', cart_id: existing.rows[0].id });
      }
    }

    const result = await query(
      'INSERT INTO cart (user_id, food_id, quantity, price, total) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [user_id || null, food_id, qty, parseFloat(parseFloat(price).toFixed(2)), total]
    );
    res.status(201).json({ message: 'Item added to cart', cart_id: result.rows[0].id });
  } catch (err) {
    console.error('POST /api/cart error:', err.message);
    res.status(500).json({ message: 'Failed to add to cart', error: err.message });
  }
});

// ---- Create an order ----
app.post('/api/orders', async (req, res) => {
  const client = await pool.connect();
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

    await client.query('BEGIN');

    // Insert order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, customer_name, email, phone, address, subtotal, tax, delivery_fee, total_amount, payment_method, item_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [user_id || null, customer_name, email || null, phone, address || null, subtotal, tax, delivery_fee, total_amount, payMethod, items.length]
    );
    const orderId = orderResult.rows[0].id;

    // Insert order items
    for (const item of items) {
      const itemSubtotal = parseFloat((parseFloat(item.price) * (item.quantity || 1)).toFixed(2));
      await client.query(
        `INSERT INTO order_items (order_id, food_item_id, item_name, quantity, price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.food_item_id || null, item.item_name, item.quantity || 1, parseFloat(parseFloat(item.price).toFixed(2)), itemSubtotal]
      );
    }

    // Clear user's synced cart for this order
    if (user_id) {
      await client.query('DELETE FROM cart WHERE user_id = $1', [user_id]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Order placed successfully', order_id: orderId, total_amount });
  } catch (err) {
    await client.query('ROLLBACK');
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
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id)::int AS item_count
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/orders error:', err.message);
    res.status(500).json({ message: 'Failed to load orders', error: err.message });
  }
});

// ---- Get a single order with items ----
app.get('/api/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const orders = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (orders.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const items = await query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    res.json({ order: orders.rows[0], items: items.rows });
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
      'INSERT INTO reservations (name, email, phone, res_date, res_time, guests, message) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [name, email || null, phone, res_date, res_time, guests, message || null]
    );
    res.status(201).json({ message: 'Reservation booked successfully', reservation_id: result.rows[0].id });
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
      'INSERT INTO contacts (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, subject, message]
    );
    res.status(201).json({ message: 'Message sent successfully', contact_id: result.rows[0].id });
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
      'SELECT id, name, email, phone_no, address, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (users.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(users.rows[0]);
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
      'UPDATE users SET name = $1, email = $2, phone_no = $3, address = $4 WHERE id = $5',
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
    const users = await query('SELECT password FROM users WHERE id = $1', [req.params.id]);
    if (users.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const match = bcrypt.compareSync(String(current_password), users.rows[0].password);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    const hashedPassword = bcrypt.hashSync(String(new_password), 10);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.params.id]);
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
  query('SELECT * FROM admins WHERE id = $1 AND email = $2', [id, email])
    .then(result => {
      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      req.admin = result.rows[0];
      next();
    })
    .catch(err => res.status(500).json({ message: 'Auth error', error: err.message }));
}

// ---- Admin login ----
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admins = await query('SELECT * FROM admins WHERE email = $1', [email]);
    if (admins.rows.length === 0) {
      return res.status(401).json({ message: 'Admin not found' });
    }
    const match = bcrypt.compareSync(String(password), admins.rows[0].password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }
    res.json({
      message: 'Admin login successful',
      admin: { id: admins.rows[0].id, name: admins.rows[0].name, email: admins.rows[0].email, role: admins.rows[0].role || 'admin' }
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
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id)::int AS item_count
       FROM orders o
       ORDER BY o.created_at DESC`
    );
    res.json(orders.rows);
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
    await query('UPDATE orders SET order_status = $1 WHERE id = $2', [order_status, req.params.id]);
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
    res.json(users.rows);
  } catch (err) {
    console.error('GET /api/admin/users error:', err.message);
    res.status(500).json({ message: 'Failed to load users', error: err.message });
  }
});

// ---- Get all reservations (admin) ----
app.get('/api/admin/reservations', adminAuth, async (req, res) => {
  try {
    const reservations = await query('SELECT * FROM reservations ORDER BY created_at DESC');
    res.json(reservations.rows);
  } catch (err) {
    console.error('GET /api/admin/reservations error:', err.message);
    res.status(500).json({ message: 'Failed to load reservations', error: err.message });
  }
});

// ---- Get all contacts (admin) ----
app.get('/api/admin/contacts', adminAuth, async (req, res) => {
  try {
    const contacts = await query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json(contacts.rows);
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
    let cats = await query('SELECT id FROM categories WHERE category_name = $1', [catName]);
    let catId = null;
    if (cats.rows.length > 0) {
      catId = cats.rows[0].id;
    } else {
      const r = await query('INSERT INTO categories (category_name) VALUES ($1) RETURNING id', [catName]);
      catId = r.rows[0].id;
    }
    const defaultImg = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
    const result = await query(
      `INSERT INTO food_items (name, description, price, image_url, image, rating, category, category_id, food_type, is_best_seller)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
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
    res.status(201).json({ message: 'Food item added successfully', food_id: result.rows[0].id });
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
    let cats = await query('SELECT id FROM categories WHERE category_name = $1', [catName]);
    let catId = null;
    if (cats.rows.length > 0) {
      catId = cats.rows[0].id;
    } else {
      const r = await query('INSERT INTO categories (category_name) VALUES ($1) RETURNING id', [catName]);
      catId = r.rows[0].id;
    }
    await query(
      `UPDATE food_items
       SET name = $1, description = $2, price = $3, category = $4, category_id = $5, food_type = $6, rating = $7, is_best_seller = $8
       WHERE id = $9`,
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
    await query('DELETE FROM food_items WHERE id = $1', [req.params.id]);
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
    const result = await query('INSERT INTO categories (category_name) VALUES ($1) RETURNING id', [category_name]);
    res.status(201).json({ message: 'Category added successfully', category_id: result.rows[0].id });
  } catch (err) {
    console.error('POST /api/admin/categories error:', err.message);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Category already exists' });
    }
    res.status(500).json({ message: 'Failed to add category', error: err.message });
  }
});

// ---- Delete a category (admin) ----
app.delete('/api/admin/categories/:id', adminAuth, async (req, res) => {
  try {
    await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
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

// ---- DB diagnostic (returns actual error to debug 500s) ----
app.get('/api/debugdb', async (req, res) => {
  const info = { steps: {} };
  try {
    await query('SELECT 1');
    info.steps.connection = 'ok';
  } catch (err) {
    info.steps.connection = 'FAILED';
    info.steps.connectionError = err.message || String(err);
  }
  try {
    const r = await query('SELECT COUNT(*) AS c FROM food_items');
    info.steps.foodCount = r.rows[0].c;
  } catch (err) {
    info.steps.food_items = 'FAILED';
    info.steps.foodItemsError = err.message || String(err);
  }
  try {
    const setupDatabase = require('./setup-db');
    const ok = await setupDatabase();
    info.steps.setupDatabase = ok ? 'ok' : 'FAILED';
  } catch (err) {
    info.steps.setupDatabase = 'THREW';
    info.steps.setupError = err.message || String(err);
  }
  try {
    const r = await query('SELECT COUNT(*) AS c FROM food_items');
    info.steps.foodCountAfter = r.rows[0].c;
  } catch (err) {
    info.steps.foodCountAfter = 'FAILED';
    info.steps.foodCountAfterError = err.message || String(err);
  }
  res.json(info);
});

// ============================================================
//            STATIC FRONTEND SERVING (for Render all-in-one)
// Placed AFTER the API routes so they take priority. The HTML/
// CSS/JS files live in the project root. Serve them so Render
// hosts BOTH the API and the website on one service.
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
