// jest.setup.js - Test environment setup
const path = require('path');
const puppeteer = require('puppeteer');

// Increase timeout for E2E tests
jest.setTimeout(60000);

// Global Puppeteer setup function
global.setupPuppeteer = async () => {
  if (!global.browser) {
    global.browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      defaultViewport: {
        width: 1280,
        height: 720
      }
    });
  }
  return global.browser;
};

global.teardownPuppeteer = async () => {
  if (global.browser) {
    await global.browser.close();
    global.browser = null;
  }
};

// Global test configuration
global.SERVICES = {
  FRONTEND: 'http://localhost:3000',
  CLIENT_SERVICE: 'http://localhost:6001',
  ADMIN_SERVICE: 'http://localhost:5002', 
  LLM_SERVICE: 'http://localhost:5003'
};

// Global test utilities
global.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Add waitForTimeout polyfill for older Puppeteer compatibility
global.setupPuppeteerPolyfills = (page) => {
  if (!page.waitForTimeout) {
    page.waitForTimeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
});

// Console configuration for cleaner test output
if (process.env.NODE_ENV === 'test') {
  // Keep console logs for debugging but filter noise
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Filter out common Puppeteer/Chrome noise
    const message = args.join(' ');
    if (message.includes('favicon') || 
        message.includes('net::ERR_') ||
        message.includes('DevTools listening')) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// Axios configuration for tests
const axios = require('axios');
axios.defaults.timeout = 10000;
axios.defaults.validateStatus = () => true; // Don't throw on HTTP errors in tests

// Add global test helpers
global.waitForService = async (url, maxAttempts = 30, interval = 1000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(url);
      return true;
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await global.delay(interval);
    }
  }
  return false;
};