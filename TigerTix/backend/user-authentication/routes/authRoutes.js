const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * Authentication Routes
 */

// User Registration - /register route using Express
router.post('/register', authController.register);

// User Login - /login route using Express
router.post('/login', authController.login);

// Token Verification - Verify JWT
router.get('/verify', authController.verifyToken);

// Logout - Clear session state
router.post('/logout', authController.logout);

// Get Current User - Protected route with inline token verification
router.get('/me', authController.getCurrentUser);

module.exports = router;
