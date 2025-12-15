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
  console.log('✅ Connected to database\n');

  db.query('DESC orders', (err, results) => {
    if (err) {
      console.error('Error:', err.message);
      db.end();
      process.exit(1);
    }
    console.log('Orders table structure:');
    console.table(results);
    
    db.query('DESC order_items', (err, results2) => {
      if (err) {
        console.error('Error:', err.message);
        db.end();
        process.exit(1);
      }
      console.log('\nOrder Items table structure:');
      console.table(results2);
      db.end();
      process.exit(0);
    });
  });
});
