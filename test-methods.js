const db = require('./db/connection');

// Test transaction support
console.log('Testing transaction support...');
console.log('db.beginTransaction:', typeof db.beginTransaction);
console.log('db.commit:', typeof db.commit);
console.log('db.rollback:', typeof db.rollback);
console.log('\nAll methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(db)));

setTimeout(() => process.exit(0), 1000);
