// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db/connection');
const { verifyToken, requireRole, logoutToken } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use("/", express.static("./public"));

const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';
const JWT_EXPIRY = process.env.JWT_EXPIRES_IN || '1h';

// ========== تست اتصال ==========
app.get('/api/test', (req, res) => {
  db.query('SELECT NOW() AS `current_time`', (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database connection failed!',
        error: err.message
      });
    }
    res.json({
      success: true,
      message: 'Hello World',
      database_time: result[0].current_time
    });
  });
});

// ========== لیست محصولات (عمومی) ==========
app.get('/api/products', (req, res) => {
  const sql = 'SELECT * FROM products';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ========== محصول بر اساس id ==========
app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const sql = 'SELECT * FROM products WHERE id = ?';
  
  db.query(sql, [productId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(404).json({ message: 'محصولی با این شناسه یافت نشد' });
    }
    res.json(results[0]);
  });
});

// ========== ثبت‌نام ==========
app.post('/api/signup', async (req, res) => {
  const { name, email, password, address, phone, role } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: 'لطفاً همه فیلدهای ضروری را وارد کنید' });

  try {
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ message: 'خطا در پایگاه‌داده', error: err.message });
      if (results.length > 0) return res.status(409).json({ message: 'کاربری با این ایمیل وجود دارد' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const sql = `INSERT INTO users (name, email, password, address, phone, role) VALUES (?, ?, ?, ?, ?, ?)`;
      db.query(sql, [name, email, hashedPassword, address || null, phone || null, role || 'customer'], (err, result) => {
        if (err) return res.status(500).json({ message: 'خطا در ثبت‌نام', error: err.message });

        const token = jwt.sign(
          { id: result.insertId, email, role: role || 'customer' },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRY }
        );

        res.status(201).json({
          message: 'ثبت‌نام با موفقیت انجام شد',
          token,
          user: { id: result.insertId, name, email, role: role || 'customer' }
        });
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ورود ==========
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: 'ایمیل و رمز لازم است' });

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ message: 'کاربر یافت نشد' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'رمز عبور اشتباه است' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      message: 'ورود موفق',
      token,
      user: { id: user.id, name: user.name, role: user.role, email: user.email }
    });
  });
});

// ========== خروج ==========
app.post('/api/logout', verifyToken, (req, res) => {
  logoutToken(req, res);
});

// ========== داشبورد نقش‌محور ==========
app.get('/api/dashboard', verifyToken, (req, res) => {
  const role = req.user.role;
  const userId = req.user.id;

  if (role === 'admin') {
    const queries = `
      SELECT COUNT(*) AS product_count FROM products;
      SELECT COUNT(*) AS order_count FROM orders;
      SELECT COALESCE(SUM(total_price), 0) AS total_revenue FROM orders;
      SELECT id, name, price, stock, category, image_url FROM products ORDER BY id DESC;
    `;

    db.query(queries, (err, results) => {
      if (err) return res.status(500).json({ message: 'خطا', error: err.message });

      res.json({
        role: 'admin',
        stats: {
          productCount: results[0][0].product_count,
          orderCount: results[1][0].order_count,
          totalRevenue: results[2][0].total_revenue
        },
        products: results[3]
      });
    });
  } else {
    const ordersSql = `
      SELECT id, total_price, order_date, status
      FROM orders
      WHERE user_id = ?
      ORDER BY order_date DESC
      LIMIT 50
    `;

    db.query(ordersSql, [userId], (err, orders) => {
      if (err) return res.status(500).json({ message: 'خطا در دریافت سفارش‌ها', error: err.message });

      res.json({
        role: 'customer',
        orders: orders || []
      });
    });
  }
});

// ========== افزودن محصول (ادمین) ==========
app.post('/api/admin/products', verifyToken, requireRole('admin'), (req, res) => {
  const { name, description, price, stock, image_url, category } = req.body;
  if (!name || price == null) return res.status(400).json({ message: 'نام و قیمت لازم است' });

  db.query(
    'INSERT INTO products (name, description, price, stock, image_url, category) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description || null, price, stock || 0, image_url || null, category || null],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'خطا در ایجاد محصول', error: err.message });
      res.status(201).json({ message: 'محصول ایجاد شد', productId: result.insertId });
    }
  );
});

// ========== حذف محصول (ادمین) ==========
app.delete('/api/admin/products/:id', verifyToken, requireRole('admin'), (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM products WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ message: 'خطا در حذف محصول', error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'محصول یافت نشد' });
    res.json({ message: 'محصول حذف شد' });
  });
});

// ========== ثبت سفارش (مشتری) ==========
app.post('/api/orders', verifyToken, (req, res) => {
  const { items } = req.body;
  const userId = req.user.id;

  if (!items?.length) return res.status(400).json({ message: 'سبد خالی' });

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  db.query('INSERT INTO orders (user_id, total_price) VALUES (?, ?)', [userId, total], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    const orderId = result.insertId;
    const values = items.map(i => [orderId, i.id, i.qty, i.price]);

    db.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?', [values], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'سفارش ثبت شد', orderId });
    });
  });
});

// ========== صفحه اصلی ==========
app.get('/', (req, res) => res.send('Server and Database are ready!'));

// ========== راه‌اندازی سرور ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});