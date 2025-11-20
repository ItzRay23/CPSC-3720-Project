/**
 * @fileoverview Unit tests for User Authentication Service
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// Mock the userModel before requiring routes/controllers
jest.mock('../../models/userModel');

const userModel = require('../../models/userModel');

// In-memory test database
const mockUsers = new Map();
let nextUserId = 1;

// Create Express app for testing
let app;

beforeAll(() => {
  // Setup mock implementations
  userModel.createUser.mockImplementation(async (email, password, firstName, lastName) => {
    // Check if user exists
    for (const [id, user] of mockUsers) {
      if (user.email === email) {
        throw new Error('User already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: nextUserId++,
      email,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      created_at: new Date().toISOString()
    };

    mockUsers.set(newUser.id, newUser);

    // Return without password_hash
    return {
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      created_at: newUser.created_at
    };
  });

  userModel.findByEmail.mockImplementation(async (email) => {
    for (const [id, user] of mockUsers) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  });

  userModel.findById.mockImplementation(async (id) => {
    const user = mockUsers.get(id);
    if (!user) {
      return null;
    }
    // Return without password_hash
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at
    };
  });

  userModel.verifyPassword.mockImplementation(async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  });

  userModel.updateLastLogin.mockImplementation(async (userId) => {
    const user = mockUsers.get(userId);
    if (user) {
      user.last_login = new Date().toISOString();
    }
  });

  // Create test app
  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));

  const authRoutes = require('../../routes/authRoutes');
  app.use('/api/auth', authRoutes);
});

afterEach(() => {
  // Clear mock users after each test to ensure test isolation
  mockUsers.clear();
  nextUserId = 1;
});

afterAll(() => {
  jest.clearAllMocks();
});

describe('User Authentication Service', () => {
  
  describe('POST /api/auth/register - User Registration', () => {
    test('should register a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.firstName).toBe(userData.firstName);
      expect(response.body.user.lastName).toBe(userData.lastName);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    test('should return 400 when required fields are missing', async () => {
      const incompleteData = {
        email: 'incomplete@example.com',
        password: 'password123'
        // Missing firstName and lastName
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'All fields are required');
    });

    test('should return 409 when user already exists', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      // Register user first time
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'User already exists');
    });
  });

  describe('POST /api/auth/login - User Login', () => {
    test('should login with valid credentials and return JWT token', async () => {
      // First register a user
      const userData = {
        email: 'login@example.com',
        password: 'testPassword123',
        firstName: 'Login',
        lastName: 'User'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Then login
      const loginData = {
        email: 'login@example.com',
        password: 'testPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
      
      // Check that token is a valid JWT format (3 parts separated by dots)
      const tokenParts = response.body.token.split('.');
      expect(tokenParts).toHaveLength(3);

      // Check for HTTP-only cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.startsWith('authToken='))).toBe(true);
    });

    test('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('should return 401 for invalid password', async () => {
      // First register a user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'wrongpass@example.com',
          password: 'correctPassword',
          firstName: 'Test',
          lastName: 'User'
        });

      // Try to login with wrong password
      const loginData = {
        email: 'wrongpass@example.com',
        password: 'wrongPassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    test('should return 400 when email or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' }) // Missing password
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Email and password are required');
    });
  });

  describe('GET /api/auth/verify - Token Verification', () => {
    test('should verify valid JWT token', async () => {
      // Register and login to get a valid token
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'verify@example.com',
          password: 'password123',
          firstName: 'Verify',
          lastName: 'User'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'verify@example.com',
          password: 'password123'
        });

      const validToken = loginResponse.body.token;

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('verify@example.com');
    });

    test('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'No token provided');
      expect(response.body).toHaveProperty('expired', false);
    });

    test('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });
  });

  describe('POST /api/auth/logout - Logout', () => {
    test('should clear auth cookie on logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout successful');
      
      // Check that cookie is cleared
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const authCookie = cookies.find(cookie => cookie.startsWith('authToken='));
        if (authCookie) {
          // Cookie should be expired or empty
          expect(authCookie).toMatch(/authToken=;|Max-Age=0|Expires=/);
        }
      }
    });
  });

  describe('GET /api/auth/me - Get Current User', () => {
    test('should return current user data with valid token', async () => {
      // Register and login to get a valid token
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'currentuser@example.com',
          password: 'password123',
          firstName: 'Current',
          lastName: 'User'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'currentuser@example.com',
          password: 'password123'
        });

      const validToken = loginResponse.body.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('currentuser@example.com');
      expect(response.body.user.firstName).toBe('Current');
      expect(response.body.user.lastName).toBe('User');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    test('should return 401 without authentication token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.');
    });
  });
});
