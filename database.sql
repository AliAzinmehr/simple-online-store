-- database.sql
CREATE DATABASE IF NOT EXISTS shop_db;
USE shop_db;

-- 🧍‍♂️ جدول کاربران (Users)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('customer','admin') DEFAULT 'customer',
  address VARCHAR(255),
  phone VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 🛒 جدول محصولات (Products)
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(15,2) NOT NULL,
  stock INT DEFAULT 0,
  image_url VARCHAR(255),
  category VARCHAR(100),
  specifications LONGTEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- افزودن ستون specifications اگر وجود نداشته باشد
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSON;

-- افزودن ستون‌های موجود نیست برای جدول orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address VARCHAR(500);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method ENUM('cash','card','online') DEFAULT 'cash';

-- بزرگ‌تر کردن ستون‌های قیمت برای مقادیر بزرگ
ALTER TABLE orders MODIFY COLUMN total_price DECIMAL(15,2);
ALTER TABLE order_items MODIFY COLUMN unit_price DECIMAL(15,2);

-- 📦 جدول سفارش‌ها (Orders)
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  status ENUM('pending','paid','shipped','completed','cancelled') DEFAULT 'pending',
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  shipping_address VARCHAR(500),
  payment_method ENUM('cash','card','online') DEFAULT 'cash',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 🧾 جدول جزئیات سفارش (Order Items)
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
