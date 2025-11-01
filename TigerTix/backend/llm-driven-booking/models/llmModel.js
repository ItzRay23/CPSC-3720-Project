/**
 * @fileoverview LLM Model for database operations and natural language processing
 * Combines database operations with OpenAI integration for booking assistance
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { OpenAI } = require('openai');

// Connect to the shared database
const dbPath = path.join(__dirname, '../../shared-db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize OpenAI client (will use environment variable OPENAI_API_KEY)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @function getAllEvents
 * @description Retrieves all events from the database.
 * @returns {Promise<Array>} - Resolves with an array of events
 */
const getAllEvents = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM events ORDER BY date', [], (err, rows) => {
            if (err) {
                reject(new Error('Database error: ' + err.message));
                return;
            }
            resolve(rows);
        });
    });
};

/**
 * @function getEventById
 * @description Retrieves a single event by ID.
 * @param {number} id - Event ID
 * @returns {Promise<Object>} - Resolves with the event object
 */
const getEventById = (id) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM events WHERE id = ?', [id], (err, row) => {
            if (err) {
                reject(new Error('Database error: ' + err.message));
                return;
            }
            if (!row) {
                reject(new Error('Event not found'));
                return;
            }
            resolve(row);
        });
    });
};

/**
 * @function getAvailableEvents
 * @description Retrieves events with available tickets (tickets > 0).
 * @returns {Promise<Array>} - Resolves with an array of available events
 */
const getAvailableEvents = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM events WHERE tickets > 0 ORDER BY date', [], (err, rows) => {
            if (err) {
                reject(new Error('Database error: ' + err.message));
                return;
            }
            resolve(rows);
        });
    });
};

/**
 * @function searchEventsByName
 * @description Searches for events by name (case-insensitive partial match).
 * @param {string} searchTerm - Search term for event name
 * @returns {Promise<Array>} - Resolves with an array of matching events
 */
const searchEventsByName = (searchTerm) => {
    return new Promise((resolve, reject) => {
        const searchPattern = `%${searchTerm.toLowerCase()}%`;
        db.all('SELECT * FROM events WHERE LOWER(name) LIKE ? ORDER BY date', [searchPattern], (err, rows) => {
            if (err) {
                reject(new Error('Database error: ' + err.message));
                return;
            }
            resolve(rows);
        });
    });
};

/**
 * @function updateEventTickets
 * @description Updates the ticket count for an event.
 * @param {number} id - Event ID
 * @param {number} tickets - New ticket count
 * @returns {Promise<Object>} - Resolves with the updated event
 */
const updateEventTickets = (id, tickets) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE events SET tickets = ? WHERE id = ?', [tickets, id], function(err) {
            if (err) {
                reject(new Error('Database error: ' + err.message));
                return;
            }
            if (this.changes === 0) {
                reject(new Error('Event not found'));
                return;
            }
            getEventById(id).then(resolve).catch(reject);
        });
    });
};

/**
 * @function decrementEventTickets
 * @description Safely decrements ticket count by specified amount.
 * @param {number} id - Event ID
 * @param {number} ticketsToBook - Number of tickets to subtract
 * @returns {Promise<Object>} - Resolves with booking result
 */
const decrementEventTickets = (id, ticketsToBook) => {
    return new Promise((resolve, reject) => {
        // First get current ticket count
        db.get('SELECT * FROM events WHERE id = ?', [id], (err, event) => {
            if (err) {
                reject(new Error('Database error: ' + err.message));
                return;
            }
            if (!event) {
                reject(new Error('Event not found'));
                return;
            }
            
            if (event.tickets < ticketsToBook) {
                reject(new Error(`Only ${event.tickets} tickets available, but ${ticketsToBook} requested`));
                return;
            }
            
            const newTicketCount = event.tickets - ticketsToBook;
            db.run('UPDATE events SET tickets = ? WHERE id = ?', [newTicketCount, id], function(err) {
                if (err) {
                    reject(new Error('Database error: ' + err.message));
                    return;
                }
                resolve({ 
                    success: true, 
                    event: { ...event, tickets: newTicketCount },
                    ticketsBooked: ticketsToBook
                });
            });
        });
    });
};

/**
 * @function parseBookingRequest
 * @description Uses LLM to parse natural language booking requests into structured data
 * @param {string} userInput - Natural language input from user
 * @param {Array} availableEvents - List of available events for context
 * @returns {Promise<Object>} - Structured booking data or error
 */
async function parseBookingRequest(userInput, availableEvents = []) {
    try {
        // Create event context for the LLM
        const eventContext = availableEvents.length > 0 
            ? `Available events: ${availableEvents.map(e => `"${e.name}" (ID: ${e.id}, Available tickets: ${e.tickets})`).join(', ')}`
            : 'No events provided for context.';

        const systemPrompt = `You are a ticket booking assistant for TigerTix. Parse user requests for event ticket bookings.

${eventContext}

Extract the following information from user input and respond ONLY with valid JSON:
{
  "intent": "booking|greeting|show_events|unknown",
  "event": "event name or null",
  "eventId": "event ID number or null", 
  "tickets": "number of tickets or null",
  "confidence": "high|medium|low",
  "message": "brief response to user"
}

Rules:
- Match event names flexibly (partial matches OK)
- If multiple events match, pick the closest match
- Default tickets to 1 if not specified in booking request
- Use "greeting" intent for hello/hi messages
- Use "show_events" intent for requests to see available events
- Use "booking" intent only for clear ticket booking requests
- Set confidence based on how clear the user's intent is`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userInput }
            ],
            temperature: 0.1,
            max_tokens: 200
        });

        const response = completion.choices[0].message.content.trim();
        
        try {
            const parsed = JSON.parse(response);
            return { success: true, data: parsed };
        } catch (parseError) {
            console.error('Failed to parse LLM response as JSON:', response);
            return await fallbackParser(userInput, availableEvents);
        }

    } catch (error) {
        console.error('LLM service error:', error);
        return await fallbackParser(userInput, availableEvents);
    }
}

/**
 * @function fallbackParser
 * @description Keyword-based fallback parser when LLM fails
 * @param {string} userInput - User's input text
 * @param {Array} availableEvents - Available events for matching
 * @returns {Promise<Object>} - Structured response using keyword matching
 */
async function fallbackParser(userInput, availableEvents = []) {
    const input = userInput.toLowerCase().trim();
    
    // Greeting patterns
    const greetingPatterns = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    if (greetingPatterns.some(pattern => input.includes(pattern))) {
        return {
            success: true,
            data: {
                intent: 'greeting',
                event: null,
                eventId: null,
                tickets: null,
                confidence: 'high',
                message: 'Hello! I can help you book tickets for our events. Would you like to see available events?'
            }
        };
    }

    // Show events patterns
    const showEventsPatterns = ['show events', 'list events', 'available events', 'what events', 'events'];
    if (showEventsPatterns.some(pattern => input.includes(pattern))) {
        return {
            success: true,
            data: {
                intent: 'show_events',
                event: null,
                eventId: null,
                tickets: null,
                confidence: 'high',
                message: 'Here are the available events:'
            }
        };
    }

    // Booking patterns
    const bookingPatterns = ['book', 'buy', 'purchase', 'get', 'reserve'];
    const hasBookingIntent = bookingPatterns.some(pattern => input.includes(pattern));
    
    if (hasBookingIntent) {
        // Extract number of tickets
        const ticketMatch = input.match(/(\d+)\s*tickets?|tickets?\s*(\d+)|(\d+)/);
        const tickets = ticketMatch ? parseInt(ticketMatch[1] || ticketMatch[2] || ticketMatch[3]) : 1;

        // Try to match event name
        let matchedEvent = null;
        let eventId = null;
        
        for (const event of availableEvents) {
            const eventName = event.name.toLowerCase();
            // Check for partial matches
            if (input.includes(eventName) || eventName.includes(input.replace(/book|buy|purchase|get|reserve|\d+|tickets?/g, '').trim())) {
                matchedEvent = event.name;
                eventId = event.id;
                break;
            }
        }

        return {
            success: true,
            data: {
                intent: 'booking',
                event: matchedEvent,
                eventId: eventId,
                tickets: tickets,
                confidence: matchedEvent ? 'medium' : 'low',
                message: matchedEvent 
                    ? `I'll help you book ${tickets} ticket${tickets > 1 ? 's' : ''} for ${matchedEvent}.`
                    : `I understand you want to book ${tickets} ticket${tickets > 1 ? 's' : ''}, but I couldn't identify which event. Please specify the event name.`
            }
        };
    }

    // Unknown intent
    return {
        success: true,
        data: {
            intent: 'unknown',
            event: null,
            eventId: null,
            tickets: null,
            confidence: 'low',
            message: "I'm sorry, I didn't understand that. I can help you book tickets for events. Try saying 'show events' or 'book 2 tickets for [event name]'."
        }
    };
}

/**
 * @function generateChatResponse
 * @description Generates appropriate chat responses based on intent and context
 * @param {Object} parsedData - Parsed booking data from LLM
 * @param {Array} availableEvents - List of available events
 * @returns {Object} - Chat response with message and actions
 */
function generateChatResponse(parsedData, availableEvents = []) {
    const { intent, event, eventId, tickets, confidence } = parsedData;

    switch (intent) {
        case 'greeting':
            return {
                message: "Hello! Welcome to TigerTix. I'm your booking assistant. I can help you:\n• View available events\n• Book tickets for events\n\nJust tell me what you'd like to do!",
                actions: ['show_events'],
                requiresConfirmation: false
            };

        case 'show_events':
            if (availableEvents.length === 0) {
                return {
                    message: "Sorry, there are no events available at the moment.",
                    actions: [],
                    requiresConfirmation: false
                };
            }
            
            const eventsList = availableEvents
                .filter(e => e.tickets > 0)
                .map(e => `• ${e.name} - ${e.date} (${e.tickets} tickets available)`)
                .join('\n');
                
            return {
                message: `Here are the available events with tickets:\n\n${eventsList}\n\nWhich event would you like to book tickets for?`,
                actions: [],
                requiresConfirmation: false
            };

        case 'booking':
            if (!event || !eventId) {
                return {
                    message: "I'd like to help you book tickets, but I need to know which event you're interested in. Please specify the event name.",
                    actions: ['show_events'],
                    requiresConfirmation: false
                };
            }

            const targetEvent = availableEvents.find(e => e.id === eventId);
            if (!targetEvent) {
                return {
                    message: `Sorry, I couldn't find an event called "${event}". Would you like to see available events?`,
                    actions: ['show_events'],
                    requiresConfirmation: false
                };
            }

            if (targetEvent.tickets < tickets) {
                return {
                    message: `Sorry, ${event} only has ${targetEvent.tickets} tickets available, but you requested ${tickets}. Would you like to book ${targetEvent.tickets} tickets instead?`,
                    actions: [],
                    requiresConfirmation: false
                };
            }

            return {
                message: `Great! I can book ${tickets} ticket${tickets > 1 ? 's' : ''} for "${event}" on ${targetEvent.date}.\n\nTotal tickets: ${tickets}\nEvent: ${event}\nDate: ${targetEvent.date}\n\nWould you like to confirm this booking?`,
                actions: ['confirm_booking'],
                requiresConfirmation: true,
                bookingData: {
                    eventId: eventId,
                    eventName: event,
                    tickets: tickets,
                    date: targetEvent.date
                }
            };

        default:
            return {
                message: "I'm sorry, I didn't understand that. I can help you:\n• View available events\n• Book tickets for events\n\nTry asking 'show events' or 'book 2 tickets for [event name]'.",
                actions: ['show_events'],
                requiresConfirmation: false
            };
    }
}

// Ensure database connection is closed when the process exits
process.on('exit', () => {
    db.close();
});

module.exports = {
    // Database operations
    getAllEvents,
    getEventById,
    getAvailableEvents,
    searchEventsByName,
    updateEventTickets,
    decrementEventTickets,
    // LLM operations
    parseBookingRequest,
    generateChatResponse,
    fallbackParser
};