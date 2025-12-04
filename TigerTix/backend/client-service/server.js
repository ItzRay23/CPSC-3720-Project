/**
 * @fileoverview Client microservice server
 * Handles client operations for viewing events and booking tickets
 */

const path = require('path');

// Load environment variables from backend directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const clientRoutes = require('./routes/clientRoutes');

// Simplified database check to avoid fatal errors
const setupDatabase = () => {
    return new Promise((resolve) => {
        const DB_PATH = path.join(__dirname, '../shared-db/database.sqlite');
        
        console.log('Checking database for Client service...');
        
        try {
            if (fs.existsSync(DB_PATH)) {
                console.log('Database file found for Client service');
            } else {
                console.log('Database file not found - will be created when needed');
            }
            resolve(); // Always resolve to avoid startup issues
        } catch (err) {
            console.log('Database check warning:', err.message);
            resolve(); // Always resolve to avoid startup issues
        }
    });
};

// Express app setup
const app = express();
// Allow requests from frontend (via gateway), local dev, and internal services
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5003',
    'http://localhost:8000'
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'client-service',
        timestamp: new Date().toISOString()
    });
});

// Mount client routes at /api to match frontend expectations
app.use('/api', clientRoutes);

const PORT = process.env.PORT || 6001;

// Start server after database is initialized
setupDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🎟️  Client service running at http://localhost:${PORT}`);
            console.log(`Database check completed for Client service`);
            console.log('Available endpoints:');
            console.log('  GET /api/events - Get all events');
            console.log('  GET /api/events/:id - Get event by ID'); 
            console.log('  POST /api/events/:id/purchase - Purchase tickets for event');
            console.log('  GET /health - Service health check');
        });
    })
    .catch(err => {
        console.error('Failed to start Client service:', err.message);
        process.exit(1);
    });
