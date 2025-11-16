// db/connection.js
const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_NAME = process.env.DB_NAME || 'shop_db';

// اتصال اولیه (بدون مشخص کردن database) برای اجرای فایل SQL که DB را می‌سازد
const db = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  port: DB_PORT,
  multipleStatements: true
});

db.connect(err => {
  if (err) {
    console.error('❌ خطا در اتصال به MariaDB:', err.message);
    process.exit(1);
  }

  console.log('✅ اتصال به MariaDB برقرار شد');

  // خواندن و اجرای فایل SQL
  const schema = fs.readFileSync('./database.sql', 'utf8').replace(/shop_db/g, DB_NAME);
  db.query(schema, (err) => {
    if (err) {
      console.error('❌ خطا در اجرای فایل SQL:', err.message);
      process.exit(1);
    } else {
      console.log(`✅ دیتابیس و جداول ساخته شدند یا از قبل وجود داشتند (${DB_NAME})`);
      // بعد از ساخت دیتابیس، به پایگاه داده وصل شو
      db.changeUser({ database: DB_NAME }, err => {
        if (err) {
          console.error('❌ خطا در انتخاب دیتابیس:', err.message);
        } else {
          console.log(`✅ در حال استفاده از دیتابیس: ${DB_NAME}`);
        }
      });
    }
  });
});

module.exports = db;
