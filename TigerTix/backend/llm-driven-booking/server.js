/**
 * @fileoverview LLM-driven booking microservice server
 * Handles natural language processing for ticket booking
 */

// Load environment variables from parent directory
require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const llmRoutes = require('./routes/llmRoutes');

// Database initialization
const setupDatabase = () => {
    return new Promise((resolve, reject) => {
        const DB_PATH = path.join(__dirname, '../shared-db/database.sqlite');
        const INIT_SQL_PATH = path.join(__dirname, '../shared-db/init.sqlite');

        console.log('Setting up database for LLM service...');
        
        // Create database connection
        const db = new sqlite3.Database(DB_PATH);
        
        // Read and execute the initialization SQL
        try {
            const initSql = fs.readFileSync(INIT_SQL_PATH, 'utf-8');
            db.exec(initSql, (err) => {
                if (err) {
                    db.close();
                    reject(new Error(`Failed to initialize database: ${err.message}`));
                    return;
                }
                console.log('Database tables verified for LLM service');
                db.close(() => resolve());
            });
        } catch (err) {
            db.close();
            reject(new Error(`Failed to read init.sqlite: ${err.message}`));
        }
    });
};

// Express app setup
const app = express();
app.use(cors());
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

// Start server after database is initialized
setupDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`LLM-driven booking service running at http://localhost:${PORT}`);
            console.log(`Database verified for LLM service`);
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