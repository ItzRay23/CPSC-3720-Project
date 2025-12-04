/**
 * API Gateway for TigerTix Backend
 * Routes requests to appropriate microservices when deployed on Render
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Microservice ports (internal)
const SERVICES = {
  ADMIN: process.env.ADMIN_PORT || 5001,
  CLIENT: process.env.CLIENT_PORT || 6001,
  LLM: process.env.LLM_PORT || 5003,
  AUTH: process.env.AUTH_PORT || 5004
};

// CORS configuration
// Note: credentials: true requires a specific origin, not '*'
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001'
].filter(Boolean);

// Regex patterns for allowed origins
const allowedOriginPatterns = [
  /^https:\/\/.*\.vercel\.app$/, // All Vercel URLs (preview & production)
  /^http:\/\/localhost:\d+$/ // Any localhost port
];

// CORS middleware with proper error handling
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ CORS: Allowed (no origin header)');
      return callback(null, true);
    }
    
    console.log(`🔍 CORS: Checking origin: ${origin}`);
    
    // Check exact matches first
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Allowed origin (exact match): ${origin}`);
      return callback(null, true);
    }
    
    // Check pattern matches
    for (const pattern of allowedOriginPatterns) {
      if (pattern.test(origin)) {
        console.log(`✅ CORS: Allowed origin (pattern match): ${origin} matches ${pattern}`);
        return callback(null, true);
      }
    }
    
    // Block unrecognized origins
    console.error(`❌ CORS: BLOCKED origin: ${origin}`);
    console.error(`   Allowed origins: ${JSON.stringify(allowedOrigins)}`);
    console.error(`   Allowed patterns: ${allowedOriginPatterns.map(p => p.toString())}`);
    
    // Send proper JSON error instead of blocking silently
    callback(new Error(`CORS policy: Origin ${origin} not allowed`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Handle CORS errors explicitly
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('CORS policy')) {
    console.error('🚫 CORS Error:', err.message);
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: err.message,
      allowedOrigins: allowedOrigins,
      allowedPatterns: allowedOriginPatterns.map(p => p.toString())
    });
  }
  next(err);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      admin: `http://localhost:${SERVICES.ADMIN}`,
      client: `http://localhost:${SERVICES.CLIENT}`,
      llm: `http://localhost:${SERVICES.LLM}`,
      auth: `http://localhost:${SERVICES.AUTH}`
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TigerTix API Gateway',
    version: '1.0.0',
    endpoints: {
      admin: '/api/admin/*',
      client: '/api/client/* or /api/events/* (legacy)',
      llm: '/api/llm/*',
      auth: '/api/auth/*'
    },
    health: '/health'
  });
});

// Proxy configuration options
const proxyOptions = {
  changeOrigin: true,
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  onError: (err, req, res) => {
    console.error('❌ Proxy Error:', err.message);
    console.error('   Request:', req.method, req.path);
    res.status(502).json({
      success: false,
      error: 'Service temporarily unavailable',
      message: err.message
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxying: ${req.method} ${req.path} → ${proxyReq.path}`);
    // Forward original headers
    if (req.headers.cookie) {
      proxyReq.setHeader('Cookie', req.headers.cookie);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ Proxy Response: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
    console.log(`   Content-Type: ${proxyRes.headers['content-type']}`);
  }
};

// Admin Service proxy
app.use('/api/admin', createProxyMiddleware({
  target: `http://localhost:${SERVICES.ADMIN}`,
  pathRewrite: {
    '^/api/admin': '/api' // Remove /admin prefix when forwarding
  },
  ...proxyOptions
}));

// Client Service proxy - with legacy /api/events support
app.use(['/api/client', '/api/events'], createProxyMiddleware({
  target: `http://localhost:${SERVICES.CLIENT}`,
  pathRewrite: {
    '^/api/client': '/api', // Remove /client prefix when forwarding
    '^/api/events': '/api/events' // Keep /events as-is for legacy support
  },
  ...proxyOptions
}));

// LLM Service proxy
app.use('/api/llm', createProxyMiddleware({
  target: `http://localhost:${SERVICES.LLM}`,
  pathRewrite: {
    '^/api/llm': '/api/llm' // Keep full path
  },
  ...proxyOptions
}));

// Auth Service proxy
app.use('/api/auth', createProxyMiddleware({
  target: `http://localhost:${SERVICES.AUTH}`,
  pathRewrite: {
    '^/api/auth': '/api/auth' // Keep full path since auth service expects /api/auth
  },
  ...proxyOptions
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    availableEndpoints: [
      '/api/admin/*',
      '/api/client/*',
      '/api/events/* (legacy)',
      '/api/llm/*',
      '/api/auth/*',
      '/health'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal gateway error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start gateway
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌐 TigerTix API Gateway running on port ${PORT}`);
  console.log(`📊 Routing to microservices:`);
  console.log(`   - Admin Service: localhost:${SERVICES.ADMIN}`);
  console.log(`   - Client Service: localhost:${SERVICES.CLIENT}`);
  console.log(`   - LLM Service: localhost:${SERVICES.LLM}`);
  console.log(`   - Auth Service: localhost:${SERVICES.AUTH}`);
  console.log(`\n🔗 Gateway endpoints:`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Admin API: http://localhost:${PORT}/api/admin/*`);
  console.log(`   - Client API: http://localhost:${PORT}/api/client/*`);
  console.log(`   - LLM API: http://localhost:${PORT}/api/llm/*`);
  console.log(`   - Auth API: http://localhost:${PORT}/api/auth/*`);
  console.log(`\nEnvironment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not set (CORS: *)'}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gateway gracefully...');
  server.close(() => {
    console.log('👋 Gateway stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gateway gracefully...');
  server.close(() => {
    console.log('👋 Gateway stopped');
    process.exit(0);
  });
});
