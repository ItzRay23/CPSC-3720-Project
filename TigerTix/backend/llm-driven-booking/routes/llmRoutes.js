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
router.post('/parse', parseLLMRequest);

/**
 * @route POST /confirm-booking  
 * @description Confirm and process a booking with transaction safety
 */
router.post('/confirm-booking', confirmBooking);

/**
 * @route GET /chat-history
 * @description Get chat conversation history
 */
router.get('/chat-history', getChatHistory);

module.exports = router;