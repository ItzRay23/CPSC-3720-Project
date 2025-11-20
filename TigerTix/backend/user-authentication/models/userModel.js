const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Connect to the shared database
const dbPath = path.join(__dirname, '../../shared-db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )
`);

const userModel = {
  /**
   * Create a new user with hashed password
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @param {string} firstName - User first name
   * @param {string} lastName - User last name
   * @returns {Promise<Object>} Created user object
   */
  createUser(email, password, firstName, lastName) {
    return new Promise(async (resolve, reject) => {
      try {
        // Hash password with bcrypt (no plaintext storage)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const stmt = db.prepare(
          'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)'
        );
        
        stmt.run([email, hashedPassword, firstName, lastName], function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              reject(new Error('User already exists'));
            } else {
              reject(new Error('Database error: ' + err.message));
            }
            return;
          }
          
          // Return the newly created user
          db.get(
            'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ?',
            [this.lastID],
            (err, row) => {
              if (err) {
                reject(new Error('Database error: ' + err.message));
                return;
              }
              resolve(row);
            }
          );
        });
        
        stmt.finalize();
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
          reject(new Error('Database error: ' + err.message));
          return;
        }
        resolve(row || null);
      });
    });
  },

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) {
            reject(new Error('Database error: ' + err.message));
            return;
          }
          resolve(row || null);
        }
      );
    });
  },

  /**
   * Verify password against stored hash
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Stored hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  },

  /**
   * Update user's last login timestamp
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  updateLastLogin(userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [userId],
        function(err) {
          if (err) {
            reject(new Error('Database error: ' + err.message));
            return;
          }
          resolve();
        }
      );
    });
  }
};

// Ensure database connection is closed when the process exits
process.on('exit', () => {
  db.close();
});

module.exports = userModel;
