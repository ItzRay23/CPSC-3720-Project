/**
 * @fileoverview LLM Controller for handling natural language booking requests
 */

const { parseBookingRequest, generateChatResponse, getAllEvents } = require('../models/llmModel');

/**
 * @function parseLLMRequest
 * @description Parses natural language input and returns structured booking data
 * @param {Object} req - Express request object (expects 'message' in body)
 * @param {Object} res - Express response object
 * @returns {void}
 */
const parseLLMRequest = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Message is required and must be a non-empty string'
            });
        }

        // Get available events for context
        const availableEvents = await getAllEvents();
        
        // Parse the user's message using LLM
        const parseResult = await parseBookingRequest(message, availableEvents);
        
        if (!parseResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Failed to parse the request'
            });
        }

        // Generate appropriate chat response
        const chatResponse = generateChatResponse(parseResult.data, availableEvents);

        return res.json({
            success: true,
            parsed: parseResult.data,
            response: chatResponse
        });

    } catch (error) {
        console.error('Error in parseLLMRequest:', error);
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
    const { eventId, tickets } = req.body;

    // Validate input
    if (!eventId || !Number.isInteger(eventId) || eventId <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Valid event ID is required'
        });
    }

    if (!tickets || !Number.isInteger(tickets) || tickets <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Valid number of tickets is required'
        });
    }

    try {
        // Begin transaction-safe booking process
        const bookingResult = await processBookingWithTransaction(eventId, tickets);
        
        if (!bookingResult.success) {
            return res.status(400).json(bookingResult);
        }

        return res.json({
            success: true,
            message: `Successfully booked ${tickets} ticket${tickets > 1 ? 's' : ''} for ${bookingResult.event.name}!`,
            booking: {
                eventId: eventId,
                eventName: bookingResult.event.name,
                tickets: tickets,
                remainingTickets: bookingResult.event.tickets
            }
        });

    } catch (error) {
        console.error('Error in confirmBooking:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process booking'
        });
    }
};

/**
 * @function processBookingWithTransaction
 * @description Processes booking with SQLite transaction safety to prevent overselling
 * @param {number} eventId - Event ID to book
 * @param {number} ticketsToBook - Number of tickets to book
 * @returns {Promise<Object>} - Booking result with success status
 */
async function processBookingWithTransaction(eventId, ticketsToBook) {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    
    // Connect to database
    const dbPath = path.join(__dirname, '../../shared-db/database.sqlite');
    const db = new sqlite3.Database(dbPath);

    return new Promise((resolve, reject) => {
        // Begin transaction
        db.serialize(() => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    console.error('Failed to begin transaction:', err);
                    return reject(err);
                }

                // Get current event state
                db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, event) => {
                    if (err) {
                        console.error('Error fetching event:', err);
                        db.run('ROLLBACK');
                        return resolve({
                            success: false,
                            error: 'Database error while fetching event'
                        });
                    }

                    if (!event) {
                        db.run('ROLLBACK');
                        return resolve({
                            success: false,
                            error: 'Event not found'
                        });
                    }

                    // Check ticket availability
                    if (event.tickets < ticketsToBook) {
                        db.run('ROLLBACK');
                        return resolve({
                            success: false,
                            error: `Only ${event.tickets} tickets available, but ${ticketsToBook} requested`
                        });
                    }

                    // Update ticket count
                    const newTicketCount = event.tickets - ticketsToBook;
                    db.run('UPDATE events SET tickets = ? WHERE id = ?', [newTicketCount, eventId], function(err) {
                        if (err) {
                            console.error('Error updating tickets:', err);
                            db.run('ROLLBACK');
                            return resolve({
                                success: false,
                                error: 'Failed to update ticket count'
                            });
                        }

                        // Commit transaction
                        db.run('COMMIT', (err) => {
                            if (err) {
                                console.error('Failed to commit transaction:', err);
                                db.run('ROLLBACK');
                                return resolve({
                                    success: false,
                                    error: 'Failed to complete booking'
                                });
                            }

                            // Success - return updated event
                            resolve({
                                success: true,
                                event: {
                                    ...event,
                                    tickets: newTicketCount
                                }
                            });
                        });
                    });
                });
            });
        });
    });
}

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