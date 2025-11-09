🛒 پروژه فروشگاه اینترنتی (Online Shop)

این پروژه یک وب‌اپلیکیشن فروشگاهی ساده است با Node.js (Express) و MariaDB/MySQL.
هدف: تمرین مفاهیم طراحی سیستم، پایگاه داده و احراز هویت کاربران.

📘 ساختار پوشه‌ها:
- db/connection.js : اتصال و ایجاد جداول پایگاه داده
- public/ : شامل index.html، login.html، signup.html، styles.css و تصاویر
- server.js : سرور اصلی
- package.json : پکیج‌های Node.js
- .env : تنظیمات اتصال دیتابیس

⚙️ نصب و اجرا:
1. نصب Node.js و MariaDB
2. اجرای دستورات:
   git clone <repo-url>
   cd OnlineShop
   npm install
   ساخت فایل .env با مقادیر:
     DB_HOST=127.0.0.1
     DB_USER=root
     DB_PASS=
     DB_NAME=shop_db
     PORT=3000
     JWT_SECRET=secret
   npm start
3. آدرس: http://localhost:3000

📚 جلسه 1:
طراحی هدف پروژه و ERD شامل users، categories، products، carts، orders.

🗄️ جلسه 2:
اتصال به MariaDB، ساخت جداول، ایجاد endpointهای /api/test و /api/products.

🔐 جلسه 3:
اضافه شدن ثبت‌نام و ورود کاربران با bcrypt و JWT.
APIها:
- POST /api/signup  → ثبت‌نام
- POST /api/login   → ورود با دریافت token JWT

🧪 تست:
/api/test  → بررسی اتصال
/api/products  → نمایش محصولات
/signup.html  → فرم ثبت‌نام
/login.html   → فرم ورود

📦 ابزارها:
Node.js, Express, MariaDB, bcrypt, JWT, HTML/CSS/JS


