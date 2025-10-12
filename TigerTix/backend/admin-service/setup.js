const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the shared database and init file
const DB_PATH = path.join(__dirname, '../shared-db/database.sqlite');
const INIT_SQL_PATH = path.join(__dirname, '../shared-db/init.sqlite');

// Create database connection
console.log('Connecting to database at:', DB_PATH);
const db = new sqlite3.Database(DB_PATH);

// Read and execute the initialization SQL
console.log('Reading initialization SQL from:', INIT_SQL_PATH);
const initSql = fs.readFileSync(INIT_SQL_PATH, 'utf-8');

// Execute initialization SQL
db.exec(initSql, (err) => {
    if (err) {
        console.error('Error initializing database:', err);
        process.exit(1);
    }
    console.log('Database tables created successfully');
    
    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
            process.exit(1);
        }
        console.log('Database connection closed');
    });
});