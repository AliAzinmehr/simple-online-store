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
