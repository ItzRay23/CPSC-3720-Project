const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5004;

// Middleware - CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      console.log('✅ Auth Service: Allowed (no origin)');
      return callback(null, true);
    }
    
    console.log(`🔍 Auth Service: Checking origin: ${origin}`);
    
    // Allow all Vercel URLs (preview and production), localhost
    if (/^https:\/\/.*\.vercel\.app$/.test(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        origin === process.env.FRONTEND_URL) {
      console.log(`✅ Auth Service: Allowed origin ${origin}`);
      return callback(null, true);
    }
    
    console.error(`❌ Auth Service: BLOCKED origin ${origin}`);
    return callback(null, false);
  },
  credentials: true // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 Auth Service: ${req.method} ${req.path}`);
  console.log(`   Origin: ${req.headers.origin || 'none'}`);
  console.log(`   Content-Type: ${req.headers['content-type'] || 'none'}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'User Authentication Service is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`User Authentication Service running on port ${PORT}`);
  });
}

module.exports = app;
