// db/connection.js
const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

// اتصال به MariaDB
const db = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  port: process.env.DB_PORT || 3306,
  multipleStatements: true // 👈 برای اجرای چند query
});

db.connect(err => {
  if (err) {
    console.error('❌ خطا در اتصال به MariaDB:', err.message);
    process.exit(1);
  }

  console.log('✅ اتصال به MariaDB برقرار شد');

  // خواندن و اجرای فایل SQL
  const schema = fs.readFileSync('./database.sql', 'utf8');

  db.query(schema, (err) => {
    if (err) {
      console.error('❌ خطا در اجرای فایل SQL:', err.message);
    } else {
      console.log('✅ دیتابیس و جداول ساخته شدند (یا از قبل وجود داشتند)');
      // بعد از ساخت دیتابیس، به پایگاه داده وصل شو
      db.changeUser({ database: process.env.DB_NAME }, err => {
        if (err) console.error('❌ خطا در انتخاب دیتابیس:', err.message);
      });
    }
  });
});

module.exports = db;
