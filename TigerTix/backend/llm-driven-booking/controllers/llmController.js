/**
 * @fileoverview LLM Controller for handling natural language booking requests
 */

const { parseBookingRequest, generateChatResponse, getAllEvents, purchaseTicketsFromClient } = require('../models/llmModel');

/**
 * @function parseLLMRequest
 * @description Parses natural language input and returns structured booking data
 * @param {Object} req - Express request object (expects 'message' in body)
 * @param {Object} res - Express response object
 * @returns {void}
 */
const parseLLMRequest = async (req, res) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    console.log(`\n🚀 [${requestId}] NEW LLM REQUEST received at ${new Date().toISOString()}`);
    console.log(`📝 [${requestId}] Request body:`, JSON.stringify(req.body, null, 2));
    
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            console.log(`❌ [${requestId}] VALIDATION FAILED: Empty or invalid message`);
            return res.status(400).json({
                success: false,
                error: 'Message is required and must be a non-empty string'
            });
        }

        console.log(`📨 [${requestId}] Processing message: "${message}"`);
        
        // Get available events for context
        console.log(`🎫 [${requestId}] Fetching available events...`);
        const availableEvents = await getAllEvents();
        console.log(`✅ [${requestId}] Found ${availableEvents.length} events in database`);
        
        // Parse the user's message using LLM
        console.log(`🤖 [${requestId}] Sending to LLM for parsing...`);
        const parseResult = await parseBookingRequest(message, availableEvents);
        
        if (!parseResult.success) {
            console.log(`❌ [${requestId}] LLM PARSING FAILED`);
            return res.status(500).json({
                success: false,
                error: 'Failed to parse the request'
            });
        }

        console.log(`✅ [${requestId}] LLM parsing successful:`, JSON.stringify(parseResult.data, null, 2));

        // Generate appropriate chat response
        console.log(`💬 [${requestId}] Generating chat response...`);
        const chatResponse = generateChatResponse(parseResult.data, availableEvents);
        console.log(`✅ [${requestId}] Chat response generated`);

        const processingTime = Date.now() - startTime;
        console.log(`🎉 [${requestId}] REQUEST COMPLETED in ${processingTime}ms`);
        console.log(`📤 [${requestId}] Sending response:`, JSON.stringify({
            success: true,
            parsed: parseResult.data,
            response: chatResponse
        }, null, 2));

        return res.json({
            success: true,
            parsed: parseResult.data,
            response: chatResponse
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`💥 [${requestId}] ERROR after ${processingTime}ms:`, error);
        console.error(`🔍 [${requestId}] Error stack:`, error.stack);
        res.status(500).json({
            success: false,
            error: 'Internal server error while processing your request'
        });
    }
};

/**
 * @function confirmBooking
 * @description Confirms and processes a booking with database transaction safety
 * @param {Object} req - Express request object (expects booking data in body)
 * @param {Object} res - Express response object  
 * @returns {void}
 */
const confirmBooking = async (req, res) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    console.log(`\n🎫 [${requestId}] BOOKING CONFIRMATION started at ${new Date().toISOString()}`);
    console.log(`📝 [${requestId}] Booking request:`, JSON.stringify(req.body, null, 2));
    
    const { eventId, tickets } = req.body;

    // Validate input
    if (!eventId || !Number.isInteger(eventId) || eventId <= 0) {
        console.log(`❌ [${requestId}] VALIDATION FAILED: Invalid event ID (${eventId})`);
        return res.status(400).json({
            success: false,
            error: 'Valid event ID is required'
        });
    }

    if (!tickets || !Number.isInteger(tickets) || tickets <= 0) {
        console.log(`❌ [${requestId}] VALIDATION FAILED: Invalid ticket count (${tickets})`);
        return res.status(400).json({
            success: false,
            error: 'Valid number of tickets is required'
        });
    }

    console.log(`✅ [${requestId}] Validation passed - Event ID: ${eventId}, Tickets: ${tickets}`);

    try {
        // Purchase tickets through client service
        console.log(`🔄 [${requestId}] Purchasing tickets via client service...`);
        const bookingResult = await purchaseTicketsFromClient(eventId, tickets);
        
        if (!bookingResult.success) {
            console.log(`❌ [${requestId}] BOOKING FAILED:`, bookingResult.error);
            return res.status(400).json({
                success: false,
                error: bookingResult.error || 'Failed to complete booking'
            });
        }

        const processingTime = Date.now() - startTime;
        console.log(`🎉 [${requestId}] BOOKING SUCCESSFUL in ${processingTime}ms`);
        console.log(`✅ [${requestId}] Booked ${tickets} tickets for "${bookingResult.event.name}"`);
        console.log(`📊 [${requestId}] Remaining tickets: ${bookingResult.event.tickets}`);
        
        const response = {
            success: true,
            message: `Successfully booked ${tickets} ticket${tickets > 1 ? 's' : ''} for ${bookingResult.event.name}!`,
            booking: {
                event: bookingResult.event.name,
                tickets: tickets
            }
        };
        
        console.log(`📤 [${requestId}] Sending booking confirmation:`, JSON.stringify(response, null, 2));
        return res.json(response);

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`💥 [${requestId}] BOOKING ERROR after ${processingTime}ms:`, error);
        console.error(`🔍 [${requestId}] Error stack:`, error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to process booking'
        });
    }
};



/**
 * @function getChatHistory
 * @description Retrieves chat conversation history (placeholder for future implementation)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void}
 */
const getChatHistory = async (req, res) => {
    // For now, return empty history
    // In a full implementation, you'd store and retrieve chat messages
    res.json({
        success: true,
        messages: [],
        note: 'Chat history feature not yet implemented'
    });
};

module.exports = {
    parseLLMRequest,
    confirmBooking,
    getChatHistory
};