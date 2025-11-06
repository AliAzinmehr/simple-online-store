const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db/connection');

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 برای فایل‌های استاتیک
app.use("/", express.static("./public"));

// ================== مسیر تست ==================
app.get('/api/test', (req, res) => {
  db.query('SELECT NOW() AS `current_time`', (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: '❌ Database connection failed!',
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

// ================== دریافت تمام محصولات ==================
app.get('/api/products', (req, res) => {
  const sql = 'SELECT * FROM products';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ================== دریافت محصول خاص بر اساس id ==================
app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const sql = 'SELECT * FROM products WHERE id = ?';
  
  db.query(sql, [productId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(404).json({ message: '❌ محصولی با این شناسه یافت نشد' });
    }

    res.json(results[0]);
  });
});

// ================== مسیر اصلی ==================
app.get('/', (req, res) => res.send('✅ Server and Database are ready!'));

// ================== راه‌اندازی سرور ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 🔐 ثبت‌نام
app.post('/api/signup', async (req, res) => {
  const { name, email, password, address, phone, role } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: 'لطفاً همه فیلدهای ضروری را وارد کنید' });

  try {
    // بررسی وجود کاربر
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (results.length > 0) {
        return res.status(409).json({ message: 'کاربری با این ایمیل وجود دارد' });
      }

      // هش کردن رمز
      const hashedPassword = await bcrypt.hash(password, 10);

      // درج در دیتابیس
      const sql = `INSERT INTO users (name, email, password, address, phone, role) VALUES (?, ?, ?, ?, ?, ?)`;
      db.query(sql, [name, email, hashedPassword, address, phone, role || 'customer'], (err) => {
        if (err) return res.status(500).json({ message: 'خطا در ثبت‌نام', error: err.message });
        res.status(201).json({ message: 'ثبت‌نام با موفقیت انجام شد ✅' });
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🔑 ورود
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(401).json({ message: 'کاربر یافت نشد' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ message: 'رمز عبور اشتباه است' });

    // تولید JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'mysecretkey',
      { expiresIn: '1h' }
    );

    res.json({
      message: 'ورود موفق ✅',
      token,
      user: { id: user.id, name: user.name, role: user.role }
    });
  });
});

