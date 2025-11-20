/**
 * @fileoverview Jest configuration for TigerTix backend testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Coverage settings
  collectCoverage: false, // Enable with --coverage flag
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/__tests__/**',
    '!**/jest.config.js',
    '!**/jest.setup.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Test projects for microservices
  projects: [
    {
      displayName: 'admin-service',
      testMatch: ['<rootDir>/admin-service/**/__tests__/**/*.test.js']
    },
    {
      displayName: 'client-service', 
      testMatch: ['<rootDir>/client-service/**/__tests__/**/*.test.js']
    },
    {
      displayName: 'llm-driven-booking',
      testMatch: ['<rootDir>/llm-driven-booking/**/__tests__/**/*.test.js']  
    },
    {
      displayName: 'user-authentication',
      testMatch: ['<rootDir>/user-authentication/**/__tests__/**/*.test.js']
    }
  ]
};