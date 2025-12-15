require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'shop_db'
});

db.connect(err => {
  if (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
  console.log('✅ Testing order creation...\n');

  // First, check if there's a test user
  db.query('SELECT id FROM users LIMIT 1', (err, users) => {
    if (err) {
      console.error('Error:', err.message);
      db.end();
      process.exit(1);
    }

    if (!users.length) {
      console.log('❌ No users found. Creating test user...');
      // Create test user
      const bcrypt = require('bcrypt');
      bcrypt.hash('test123', 10, (err, hash) => {
        db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
          ['Test User', 'test@example.com', hash, 'customer'],
          (err, result) => {
            if (err) {
              console.error('Error creating user:', err.message);
              db.end();
              process.exit(1);
            }
            console.log('User created with ID:', result.insertId);
            testOrder(result.insertId);
          }
        );
      });
    } else {
      testOrder(users[0].id);
    }
  });

  function testOrder(userId) {
    // Check if there's a product
    db.query('SELECT id, name, price FROM products LIMIT 1', (err, products) => {
      if (err) {
        console.error('Error:', err.message);
        db.end();
        process.exit(1);
      }

      if (!products.length) {
        console.log('❌ No products found.');
        db.end();
        process.exit(1);
      }

      const product = products[0];
      console.log('Testing with product:', product);

      // Try to insert an order
      db.query(
        'INSERT INTO orders (user_id, total_price, shipping_address, payment_method) VALUES (?, ?, ?, ?)',
        [userId, 100.00, 'Test Address', 'cash'],
        (err, result) => {
          if (err) {
            console.error('❌ Error inserting order:', err.message);
            db.end();
            process.exit(1);
          }
          console.log('✅ Order created with ID:', result.insertId);

          const orderId = result.insertId;
          // Insert order item
          db.query(
            'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
            [orderId, product.id, 1, product.price],
            (err, result2) => {
              if (err) {
                console.error('❌ Error inserting order item:', err.message);
                db.end();
                process.exit(1);
              }
              console.log('✅ Order item created');

              // Verify
              db.query('SELECT * FROM orders WHERE id = ?', [orderId], (err, orders) => {
                console.log('\n✅ Order verification:');
                console.table(orders);
                db.end();
                process.exit(0);
              });
            }
          );
        }
      );
    });
  }
});
