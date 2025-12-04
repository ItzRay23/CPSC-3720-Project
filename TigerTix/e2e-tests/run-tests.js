#!/usr/bin/env node

/**
 * @fileoverview TigerTix E2E Test Runner
 * Orchestrates the complete testing process with service health checks
 */

const { spawn } = require('child_process');
const axios = require('axios');

// Use environment variables for deployed services, fallback to localhost for local testing
const SERVICES = {
  FRONTEND: process.env.FRONTEND_URL || 'http://localhost:3000',
  ADMIN_SERVICE: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/admin` : 'http://localhost:5002',
  CLIENT_SERVICE: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/client` : 'http://localhost:6001', 
  LLM_SERVICE: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/llm` : 'http://localhost:5003'
};

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

async function checkServiceHealth() {
  log('\n🔍 Checking service health...', COLORS.BLUE);
  
  const healthChecks = [
    { name: 'Frontend', url: SERVICES.FRONTEND },
    { name: 'Admin Service', url: `${SERVICES.ADMIN_SERVICE}/api/events` },
    { name: 'Client Service', url: `${SERVICES.CLIENT_SERVICE}/api/events` },
    { name: 'LLM Service', url: `${SERVICES.LLM_SERVICE}/api/llm/chat-history` }
  ];

  const results = [];
  
  for (const check of healthChecks) {
    try {
      await axios.get(check.url, { timeout: 5000 });
      log(`  ✅ ${check.name} - OK`, COLORS.GREEN);
      results.push({ ...check, status: 'ok' });
    } catch (error) {
      log(`  ❌ ${check.name} - DOWN`, COLORS.RED);
      results.push({ ...check, status: 'down', error: error.message });
    }
  }
  
  return results;
}

async function runTests(testType = 'all') {
  const testCommands = {
    integration: 'npm run test:integration',
    browser: 'npm run test:browser', 
    api: 'npm run test:api',
    system: 'npm run test:system',
    frontend: 'npm run test:frontend',
    journey: 'npm run test:journey',
    all: 'npm run test:all'
  };

  const command = testCommands[testType] || testCommands.all;
  
  log(`\n🧪 Running ${testType} tests...`, COLORS.BLUE);
  log(`Command: ${command}`, COLORS.YELLOW);
  
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const testProcess = spawn(cmd, args, { 
      stdio: 'inherit',
      shell: true 
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        log(`\n✅ ${testType} tests completed successfully!`, COLORS.GREEN);
        resolve(code);
      } else {
        log(`\n❌ ${testType} tests failed with code ${code}`, COLORS.RED);
        reject(new Error(`Tests failed with code ${code}`));
      }
    });
    
    testProcess.on('error', (error) => {
      log(`\n💥 Error running tests: ${error.message}`, COLORS.RED);
      reject(error);
    });
  });
}

function printUsage() {
  log('\n🎫 TigerTix E2E Test Runner', COLORS.BOLD);
  log('Usage: node run-tests.js [test-type]\n');
  log('Test Types:');
  log('  integration  - Run API integration tests');
  log('  browser      - Run all browser E2E tests');
  log('  api          - Run individual API tests');
  log('  system       - Run full system tests');
  log('  frontend     - Run frontend UI tests');
  log('  journey      - Run user journey tests');
  log('  all          - Run complete test suite (default)\n');
  log('Examples:');
  log('  node run-tests.js integration');
  log('  node run-tests.js browser');
  log('  node run-tests.js all\n');
}

async function main() {
  const testType = process.argv[2] || 'all';
  
  if (testType === 'help' || testType === '--help' || testType === '-h') {
    printUsage();
    return;
  }

  try {
    log('🎫 TigerTix E2E Test Runner', COLORS.BOLD + COLORS.BLUE);
    
    // Health check
    const healthResults = await checkServiceHealth();
    const downServices = healthResults.filter(r => r.status === 'down');
    
    if (downServices.length > 0) {
      log('\n⚠️  Warning: Some services are not running:', COLORS.YELLOW);
      downServices.forEach(service => {
        log(`  - ${service.name}: ${service.error}`, COLORS.YELLOW);
      });
      
      if (testType === 'browser' || testType === 'frontend' || testType === 'journey') {
        if (downServices.some(s => s.name === 'Frontend')) {
          log('\n❌ Frontend is required for browser tests. Please start the frontend service.', COLORS.RED);
          process.exit(1);
        }
      }
      
      log('\n⚠️  Some tests may fail due to missing services.', COLORS.YELLOW);
      log('To start all services, run in separate terminals:', COLORS.YELLOW);
      log('  cd backend && PORT=5002 node server.js  # Admin Service');
      log('  cd backend && PORT=6001 node server.js  # Client Service');
      log('  cd backend && PORT=5003 node server.js  # LLM Service');
      log('  cd frontend && npm start               # Frontend');
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('\nContinue with tests anyway? (y/N): ', resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        log('Tests cancelled.', COLORS.YELLOW);
        process.exit(0);
      }
    } else {
      log('\n🎉 All services are healthy!', COLORS.GREEN);
    }
    
    // Run tests
    await runTests(testType);
    
    log('\n🎉 Test run completed successfully!', COLORS.GREEN + COLORS.BOLD);
    
  } catch (error) {
    log(`\n💥 Test run failed: ${error.message}`, COLORS.RED);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n⏹️  Test run interrupted by user', COLORS.YELLOW);
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n\n⏹️  Test run terminated', COLORS.YELLOW);
  process.exit(143);
});

if (require.main === module) {
  main().catch(error => {
    log(`💥 Unexpected error: ${error.message}`, COLORS.RED);
    process.exit(1);
  });
}

module.exports = { checkServiceHealth, runTests };