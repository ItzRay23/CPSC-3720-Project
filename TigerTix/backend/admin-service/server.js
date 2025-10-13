const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const adminRoutes = require('./routes/adminRoutes');

// Database initialization
const setupDatabase = () => {
    return new Promise((resolve, reject) => {
        const DB_PATH = path.join(__dirname, '../shared-db/database.sqlite');
        const INIT_SQL_PATH = path.join(__dirname, '../shared-db/init.sqlite');

        console.log('Setting up database...');
        
        // Create database connection
        const db = new sqlite3.Database(DB_PATH);
        
        // Read and execute the initialization SQL
        try {
            const initSql = fs.readFileSync(INIT_SQL_PATH, 'utf-8');
            db.exec(initSql, (err) => {
                if (err) {
                    db.close();
                    reject(new Error(`Failed to initialize database: ${err.message}`));
                    return;
                }
                console.log('Database tables created successfully');
                db.close(() => resolve());
            });
        } catch (err) {
            db.close();
            reject(new Error(`Failed to read init.sqlite: ${err.message}`));
        }
    });
};

// Express app setup
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', adminRoutes);

const PORT = process.env.PORT || 5001;

// Start server after database is initialized
setupDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Database initialized successfully`);
            console.log(`Admin service running at http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    });
