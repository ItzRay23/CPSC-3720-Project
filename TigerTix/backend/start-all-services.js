/**
 * Start all TigerTix backend microservices with API Gateway
 * This script is designed for Render deployment where all services run in a single container
 */

const { spawn } = require('child_process');
const path = require('path');

// Define all microservices with their paths and default ports
const services = [
  {
    name: 'Admin Service',
    path: path.join(__dirname, 'admin-service', 'server.js'),
    port: process.env.ADMIN_PORT || 5001,
    env: { 
      PORT: process.env.ADMIN_PORT || 5001,
      FRONTEND_URL: process.env.FRONTEND_URL
    }
  },
  {
    name: 'Client Service',
    path: path.join(__dirname, 'client-service', 'server.js'),
    port: process.env.CLIENT_PORT || 6001,
    env: { 
      PORT: process.env.CLIENT_PORT || 6001,
      FRONTEND_URL: process.env.FRONTEND_URL
    }
  },
  {
    name: 'LLM Booking Service',
    path: path.join(__dirname, 'llm-driven-booking', 'server.js'),
    port: process.env.LLM_PORT || 5003,
    env: { 
      PORT: process.env.LLM_PORT || 5003,
      FRONTEND_URL: process.env.FRONTEND_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    }
  },
  {
    name: 'User Authentication Service',
    path: path.join(__dirname, 'user-authentication', 'server.js'),
    port: process.env.AUTH_PORT || 5004,
    env: { 
      PORT: process.env.AUTH_PORT || 5004,
      FRONTEND_URL: process.env.FRONTEND_URL
    }
  },
  {
    name: 'API Gateway',
    path: path.join(__dirname, 'gateway.js'),
    port: process.env.PORT || 8000,
    env: {
      PORT: process.env.PORT || 8000,
      ADMIN_PORT: process.env.ADMIN_PORT || 5001,
      CLIENT_PORT: process.env.CLIENT_PORT || 6001,
      LLM_PORT: process.env.LLM_PORT || 5003,
      AUTH_PORT: process.env.AUTH_PORT || 5004,
      FRONTEND_URL: process.env.FRONTEND_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    }
  }
];

// Track running processes
const processes = [];

// Handle graceful shutdown
function shutdown() {
  console.log('\n🛑 Shutting down all services...');
  processes.forEach(proc => {
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  });
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

// Listen for shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => {
  console.log('👋 All services stopped');
});

// Start each microservice
console.log('🚀 Starting TigerTix Backend Microservices...\n');

services.forEach((service, index) => {
  console.log(`📦 Starting ${service.name} on port ${service.port}...`);
  
  // Merge environment variables
  const env = {
    ...process.env,
    ...service.env,
    NODE_ENV: process.env.NODE_ENV || 'production'
  };

  // Spawn the service process
  const proc = spawn('node', [service.path], {
    env,
    stdio: 'inherit',
    cwd: path.dirname(service.path)
  });

  // Handle process errors
  proc.on('error', (err) => {
    console.error(`❌ Error starting ${service.name}:`, err);
  });

  // Handle process exit
  proc.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`❌ ${service.name} exited with code ${code}`);
      // If any critical service fails, shut down all services
      shutdown();
    } else if (signal) {
      console.log(`⚠️  ${service.name} killed by signal ${signal}`);
    }
  });

  processes.push(proc);
});

console.log('\n✅ All services started successfully!');
console.log('📊 Service endpoints:');
services.forEach(service => {
  console.log(`   - ${service.name}: http://localhost:${service.port}`);
});
console.log('\nPress Ctrl+C to stop all services\n');

// Keep the process alive
process.stdin.resume();
