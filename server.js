// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('./db/connection');
const { verifyToken, requireRole, logoutToken } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use("/", express.static("./public"));

// ایجاد پوشه uploads اگر وجود نداشته باشد
const fs = require('fs');
if (!fs.existsSync('./public/uploads')) {
  fs.mkdirSync('./public/uploads', { recursive: true });
}

// تنظیمات آپلود عکس
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('فقط تصاویر JPG, PNG, WebP مجاز هستند'));
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';
const JWT_EXPIRY = process.env.JWT_EXPIRES_IN || '1h';

// تست اتصال
app.get('/api/test', (req, res) => {
  db.query('SELECT NOW()', (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, time: result[0]['NOW()'] });
  });
});

// لیست محصولات (عمومی)
app.get('/api/products', (req, res) => {
  db.query('SELECT * FROM products ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// جزئیات محصول
app.get('/api/products/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length) return res.status(404).json({ message: 'محصول یافت نشد' });
    res.json(results[0]);
  });
});

// ثبت‌نام
app.post('/api/signup', async (req, res) => {
  const { name, email, password, address, phone, role = 'customer' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'فیلدهای ضروری را پر کنید' });

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length) return res.status(409).json({ message: 'ایمیل قبلاً استفاده شده' });

    const hash = await bcrypt.hash(password, 10);
    db.query('INSERT INTO users (name, email, password, address, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hash, address || null, phone || null, role],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        const token = jwt.sign({ id: result.insertId, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        res.status(201).json({ message: 'ثبت‌نام موفق', token, user: { id: result.insertId, name, email, role } });
      }
    );
  });
});

// ورود
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'ایمیل و رمز لازم است' });

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || !results.length) return res.status(401).json({ message: 'کاربر یافت نشد' });
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'رمز اشتباه' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.json({ message: 'ورود موفق', token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  });
});

// خروج
app.post('/api/logout', verifyToken, (req, res) => {
  logoutToken(req, res);
});

// داشبورد نقش‌محور
app.get('/api/dashboard', verifyToken, (req, res) => {
  const { role, id: userId } = req.user;

  if (role === 'admin') {
    const q = `
      SELECT COUNT(*) AS product_count FROM products;
      SELECT COUNT(*) AS order_count FROM orders;
      SELECT COALESCE(SUM(total_price),0) AS total_revenue FROM orders;
      SELECT id,name,price,stock,category,image_url FROM products ORDER BY id DESC;
    `;
    db.query(q, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
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
    db.query('SELECT id,total_price,order_date,status FROM orders WHERE user_id=? ORDER BY order_date DESC LIMIT 50', [userId], (err, orders) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ role: 'customer', orders: orders || [] });
    });
  }
});

// افزودن محصول با آپلود عکس (ادمین)
app.post('/api/admin/products', verifyToken, requireRole('admin'), upload.single('image'), (req, res) => {
  const { name, description, price, stock, category } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !price) return res.status(400).json({ message: 'نام و قیمت الزامی است' });

  db.query('INSERT INTO products (name,description,price,stock,image_url,category) VALUES (?,?,?,?,?,?)',
    [name, description || null, price, stock || 0, image_url, category || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'محصول اضافه شد', productId: result.insertId });
    }
  );
});

// حذف محصول
app.delete('/api/admin/products/:id', verifyToken, requireRole('admin'), (req, res) => {
  db.query('DELETE FROM products WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'محصول یافت نشد' });
    res.json({ message: 'محصول حذف شد' });
  });
});

// ثبت سفارش
app.post('/api/orders', verifyToken, (req, res) => {
  const { items } = req.body;
  const userId = req.user.id;
  if (!items?.length) return res.status(400).json({ message: 'سبد خالی است' });

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  db.query('INSERT INTO orders (user_id, total_price) VALUES (?,?)', [userId, total], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    const orderId = result.insertId;
    const values = items.map(i => [orderId, i.id, i.qty, i.price]);
    db.query('INSERT INTO order_items (order_id,product_id,quantity,price) VALUES ?', [values], err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'سفارش ثبت شد', orderId });
    });
  });
});



app.get('/', (req, res) => res.send('Server Ready!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
