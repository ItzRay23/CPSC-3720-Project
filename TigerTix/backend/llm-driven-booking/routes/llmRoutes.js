/**
 * @fileoverview LLM routes for natural language booking system
 */

const express = require('express');
const router = express.Router();
const { parseLLMRequest, confirmBooking, getChatHistory } = require('../controllers/llmController');

/**
 * @route POST /parse
 * @description Parse natural language booking requests
 */
router.post('/parse', (req, res, next) => {
    console.log(`\n🌐 [ROUTE] POST /api/llm/parse hit at ${new Date().toISOString()}`);
    console.log(`🔍 [ROUTE] Request headers:`, JSON.stringify(req.headers, null, 2));
    next();
}, parseLLMRequest);

/**
 * @route POST /confirm-booking  
 * @description Confirm and process a booking with transaction safety
 */
router.post('/confirm-booking', (req, res, next) => {
    console.log(`\n🌐 [ROUTE] POST /api/llm/confirm-booking hit at ${new Date().toISOString()}`);
    console.log(`🔍 [ROUTE] Request headers:`, JSON.stringify(req.headers, null, 2));
    next();
}, confirmBooking);

/**
 * @route GET /chat-history
 * @description Get chat conversation history
 */
router.get('/chat-history', (req, res, next) => {
    console.log(`\n🌐 [ROUTE] GET /api/llm/chat-history hit at ${new Date().toISOString()}`);
    next();
}, getChatHistory);

module.exports = router;