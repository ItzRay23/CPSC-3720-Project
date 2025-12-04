/**
 * @fileoverview LLM-driven booking microservice server
 * Handles natural language processing for ticket booking
 */

const path = require('path');

// Load environment variables from backend directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const llmRoutes = require('./routes/llmRoutes');

// Service initialization - no database needed as we communicate with client service
const setupService = () => {
    return new Promise((resolve) => {
        console.log('Setting up LLM service...');
        console.log('LLM service will communicate with client service for data operations');
        resolve();
    });
};

// Express app setup
const app = express();

// CORS configuration - allow Vercel preview URLs and internal services
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        // Allow Vercel preview and production URLs, localhost, and internal services
        if (/^https:\/\/cpsc-3720-project.*\.vercel\.app$/.test(origin) ||
            /^http:\/\/localhost:\d+$/.test(origin) ||
            origin === process.env.FRONTEND_URL) {
            return callback(null, true);
        }
        
        console.warn(`LLM Service: Blocked origin ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'llm-driven-booking',
        timestamp: new Date().toISOString()
    });
});

// Mount LLM routes
app.use('/api/llm', llmRoutes);

const PORT = process.env.PORT || 5003;

// Start server after service is initialized
setupService()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🤖 LLM-driven booking service running at http://localhost:${PORT}`);
            console.log(`🔗 Client service communication target: http://localhost:6001`);
            console.log('Available endpoints:');
            console.log('  POST /api/llm/parse - Parse natural language booking requests');
            console.log('  POST /api/llm/confirm-booking - Confirm and process bookings');
            console.log('  GET /api/llm/chat-history - Get chat conversation history');
            console.log('  GET /health - Service health check');
            
            // Environment check
            if (process.env.OPENAI_API_KEY) {
                console.log(`✅ OpenAI API key loaded`);
            } else {
                console.log(`⚠️  OpenAI API key not found - using fallback parsing`);
            }
        });
    })
    .catch(err => {
        console.error('Failed to start LLM service:', err.message);
        process.exit(1);
    });