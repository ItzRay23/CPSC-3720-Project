const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

/**
 * Authentication Routes
 */

// User Registration (13 pts) - /register route using Express
router.post('/register', authController.register);

// User Login (13 pts) - /login route using Express
router.post('/login', authController.login);

// Token Verification (13 pts) - Verify JWT
router.get('/verify', authController.verifyToken);

// Logout (7 pts) - Clear session state
router.post('/logout', authController.logout);

// Get Current User (7 pts) - Protected route with inline token verification
router.get('/me', authController.getCurrentUser);

module.exports = router;
