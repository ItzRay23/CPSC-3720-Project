/**
 * @fileoverview Test database utilities for TigerTix backend testing
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

/**
 * Create an in-memory test database
 * @returns {Promise<sqlite3.Database>} Test database instance
 */
const createTestDatabase = () => {
  return new Promise((resolve, reject) => {
    // Use in-memory database for tests
    const db = new sqlite3.Database(':memory:', (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('✅ Test database created in memory');
      resolve(db);
    });
  });
};

/**
 * Initialize test database with schema
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<void>}
 */
const initializeTestDatabase = (db) => {
  return new Promise((resolve, reject) => {
    const initSqlPath = path.join(__dirname, '../shared-db/init.sqlite');
    
    try {
      const initSql = fs.readFileSync(initSqlPath, 'utf-8');
      db.exec(initSql, (err) => {
        if (err) {
          reject(new Error(`Failed to initialize test database: ${err.message}`));
          return;
        }
        console.log('✅ Test database schema initialized');
        resolve();
      });
    } catch (err) {
      // If init.sqlite doesn't exist, create basic schema
      const basicSchema = `
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          location TEXT NOT NULL,
          total_tickets INTEGER NOT NULL DEFAULT 0,
          available_tickets INTEGER NOT NULL DEFAULT 0,
          price REAL NOT NULL DEFAULT 0.0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          tickets_purchased INTEGER NOT NULL DEFAULT 1,
          total_amount REAL NOT NULL DEFAULT 0.0,
          booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'confirmed',
          FOREIGN KEY (event_id) REFERENCES events (id)
        );
      `;
      
      db.exec(basicSchema, (err) => {
        if (err) {
          reject(new Error(`Failed to create basic test schema: ${err.message}`));
          return;
        }
        console.log('✅ Basic test database schema created');
        resolve();
      });
    }
  });
};

/**
 * Seed test database with sample data
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<void>}
 */
const seedTestDatabase = (db) => {
  return new Promise((resolve, reject) => {
    const sampleEvents = [
      {
        name: 'Auburn vs Alabama Football',
        description: 'Iron Bowl 2024 - The biggest rivalry in college football',
        date: '2024-11-30',
        time: '15:30',
        location: 'Jordan-Hare Stadium',
        total_tickets: 1000,
        available_tickets: 750,
        price: 85.00
      },
      {
        name: 'Auburn Basketball vs Kentucky',
        description: 'SEC Conference basketball game',
        date: '2024-12-15',
        time: '20:00',
        location: 'Auburn Arena',
        total_tickets: 500,
        available_tickets: 300,
        price: 35.00
      },
      {
        name: 'Spring Concert Series',
        description: 'Annual spring outdoor concert featuring local artists',
        date: '2025-04-20',
        time: '19:00',
        location: 'Amphitheater',
        total_tickets: 800,
        available_tickets: 800,
        price: 25.00
      }
    ];

    const insertEvent = (event) => {
      return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
          INSERT INTO events (name, description, date, time, location, total_tickets, available_tickets, price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
          event.name,
          event.description, 
          event.date,
          event.time,
          event.location,
          event.total_tickets,
          event.available_tickets,
          event.price
        ], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        });
        
        stmt.finalize();
      });
    };

    // Insert all sample events
    Promise.all(sampleEvents.map(insertEvent))
      .then((eventIds) => {
        console.log(`✅ Test database seeded with ${eventIds.length} events`);
        resolve();
      })
      .catch(reject);
  });
};

/**
 * Clean up test database
 * @param {sqlite3.Database} db - Database instance
 * @returns {Promise<void>}
 */
const cleanupTestDatabase = (db) => {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing test database:', err);
        } else {
          console.log('✅ Test database closed');
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
};

/**
 * Create a complete test database setup
 * @returns {Promise<sqlite3.Database>} Configured test database
 */
const setupTestDatabase = async () => {
  const db = await createTestDatabase();
  await initializeTestDatabase(db);
  await seedTestDatabase(db);
  return db;
};

module.exports = {
  createTestDatabase,
  initializeTestDatabase,
  seedTestDatabase,
  cleanupTestDatabase,
  setupTestDatabase
};