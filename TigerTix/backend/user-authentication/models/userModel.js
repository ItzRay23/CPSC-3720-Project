const db = require('../../shared-db/database');
const bcrypt = require('bcryptjs');

const userModel = {
  /**
   * Create a new user with hashed password
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @param {string} firstName - User first name
   * @param {string} lastName - User last name
   * @returns {Promise<Object>} Created user object
   */
  async createUser(email, password, firstName, lastName) {
    // Hash password with bcrypt (no plaintext storage)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, email, first_name, last_name, created_at
    `;
    
    const result = await db.query(query, [email, hashedPassword, firstName, lastName]);
    return result.rows[0];
  },

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  },

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  async findById(id) {
    const query = 'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
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
  async updateLastLogin(userId) {
    const query = 'UPDATE users SET last_login = NOW() WHERE id = $1';
    await db.query(query, [userId]);
  }
};

module.exports = userModel;
