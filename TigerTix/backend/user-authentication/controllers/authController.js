const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// JWT Secret (in production, store in environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRATION = '30m'; // 30 minutes as per requirements

const authController = {
  /**
   * User Registration (13 pts)
   * Create registration forms in React with backend routes (/register)
   * Store hashed passwords using bcryptjs
   */
  async register(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Check if user already exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Create user with hashed password (bcryptjs handles hashing in model)
      const newUser = await userModel.createUser(email, password, firstName, lastName);

      const responseData = {
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name
        }
      };

      console.log('✅ Registration successful, sending response:', JSON.stringify(responseData));
      res.status(201).json(responseData);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  },

  /**
   * User Login (13 pts)
   * Implement backend route (/login) using Express
   * On successful login, generate and return a JWT
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isPasswordValid = await userModel.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token using jsonwebtoken
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRATION }
      );

      // Update last login
      await userModel.updateLastLogin(user.id);

      // Store token securely in HTTP-only cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: true, // Always use HTTPS (required for sameSite: 'none')
        sameSite: 'none', // Allow cross-origin cookies (Vercel frontend → Render backend)
        maxAge: 30 * 60 * 1000 // 30 minutes
      });

      const responseData = {
        message: 'Login successful',
        token, // Also return in response for in-memory React state
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        }
      };

      console.log('✅ Login successful, sending response:', JSON.stringify(responseData));
      res.status(200).json(responseData);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  },

  /**
   * Token Verification (13 pts)
   * Verify JWTs and handle token expiration (30 minutes)
   * Redirect expired users to login screen
   */
  async verifyToken(req, res) {
    try {
      // Get token from cookie or Authorization header
      const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'No token provided', expired: false });
      }

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user data
      const user = await userModel.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found', expired: false });
      }

      res.status(200).json({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        }
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Handle token expiration - redirect to login screen
        return res.status(401).json({ 
          error: 'Token expired', 
          expired: true,
          message: 'Please log in again'
        });
      }
      
      res.status(401).json({ error: 'Invalid token', expired: false });
    }
  },

  /**
   * Logout & Session Handling (7 pts)
   * Clear stored token and reset session state
   */
  async logout(req, res) {
    try {
      // Clear the HTTP-only cookie
      res.clearCookie('authToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      res.status(200).json({ 
        message: 'Logout successful',
        instruction: 'Clear token from React state on frontend'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  },

  /**
   * Get current user state (7 pts)
   * Show current user state on frontend (e.g., "Logged in as user@example.com")
   * Protected route - verifies JWT token inline
   */
  async getCurrentUser(req, res) {
    try {
      // Get token from cookie or Authorization header
      const token = req.cookies.authToken || req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ 
          error: 'Access denied. No token provided.',
          expired: false
        });
      }

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user data
      const user = await userModel.findById(decoded.userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        }
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired. Please log in again.',
          expired: true
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          error: 'Invalid token.',
          expired: false
        });
      }
      
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user information' });
    }
  }
};

module.exports = authController;
