/**
 * @fileoverview Jest setup file for TigerTix backend testing
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random available port for testing

// Mock console methods to reduce noise in tests (optional)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Only show console output in verbose mode
if (!process.env.VERBOSE_TESTS) {
  console.log = jest.fn();
  console.error = jest.fn();
}

// Restore console methods when needed
global.restoreConsole = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
};

// Database cleanup helper
global.cleanupDatabase = async (db) => {
  if (db && typeof db.close === 'function') {
    return new Promise((resolve) => {
      db.close((err) => {
        if (err) console.error('Database cleanup error:', err);
        resolve();
      });
    });
  }
};

// Global test utilities
global.testUtils = {
  // Mock request object
  mockReq: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides
  }),
  
  // Mock response object
  mockRes: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  },
  
  // Mock next function
  mockNext: () => jest.fn()
};

// Clean up after each test
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset any environment variables set during tests
  delete process.env.TEST_DB_PATH;
});