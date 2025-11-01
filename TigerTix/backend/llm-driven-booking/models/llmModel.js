/**
 * @fileoverview LLM Model for natural language processing and client service communication
 * Combines client service API calls with OpenAI integration for booking assistance
 */

const { OpenAI } = require('openai');

// Import fetch - handle both native fetch and node-fetch
let fetch;
try {
    // Try using native fetch first (Node.js 18+)
    fetch = globalThis.fetch;
    if (!fetch) {
        // Fallback to node-fetch for older Node.js versions
        fetch = require('node-fetch');
    }
} catch (error) {
    console.error('Failed to import fetch:', error);
    throw new Error('Fetch is not available. Please install node-fetch or use Node.js 18+');
}

// Client service configuration
const CLIENT_SERVICE_BASE_URL = process.env.CLIENT_SERVICE_URL || 'http://localhost:6001';

// Initialize OpenAI client (will use environment variable OPENAI_API_KEY)
let openai = null;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
} catch (error) {
    console.warn('OpenAI client not initialized:', error.message);
}

/**
 * @function getAllEvents
 * @description Retrieves all events from the client service.
 * @returns {Promise<Array>} - Resolves with an array of events
 */
const getAllEvents = async () => {
    try {
        console.log(`🔗 Making request to client service: ${CLIENT_SERVICE_BASE_URL}/api/events`);
        const response = await fetch(`${CLIENT_SERVICE_BASE_URL}/api/events`);
        
        if (!response.ok) {
            throw new Error(`Client service responded with ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`📄 Raw response from client service:`, JSON.stringify(data, null, 2));
        
        // Handle different response formats from client service
        const events = Array.isArray(data) ? data : data?.events ?? [];
        console.log(`✅ Retrieved ${events.length} events from client service:`, events.map(e => `${e.name} (ID: ${e.id})`));
        return events;
    } catch (error) {
        console.error('Error fetching events from client service:', error);
        throw new Error('Failed to fetch events from client service: ' + error.message);
    }
};

/**
 * @function getEventById
 * @description Retrieves a single event by ID from client service.
 * @param {number} id - Event ID
 * @returns {Promise<Object>} - Resolves with the event object
 */
const getEventById = async (id) => {
    try {
        console.log(`🔗 Fetching event ${id} from client service`);
        const response = await fetch(`${CLIENT_SERVICE_BASE_URL}/api/events/${id}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Event not found');
            }
            throw new Error(`Client service responded with ${response.status}: ${response.statusText}`);
        }
        
        const event = await response.json();
        console.log(`✅ Retrieved event "${event.name}" from client service`);
        return event;
    } catch (error) {
        console.error(`Error fetching event ${id} from client service:`, error);
        throw error;
    }
};

/**
 * @function getAvailableEvents
 * @description Retrieves events with available tickets (tickets > 0) from client service.
 * @returns {Promise<Array>} - Resolves with an array of available events
 */
const getAvailableEvents = async () => {
    try {
        const allEvents = await getAllEvents();
        const availableEvents = allEvents.filter(event => event.tickets > 0);
        console.log(`✅ Found ${availableEvents.length} available events`);
        return availableEvents;
    } catch (error) {
        console.error('Error getting available events:', error);
        throw error;
    }
};

/**
 * @function searchEventsByName
 * @description Searches for events by name (case-insensitive partial match).
 * @param {string} searchTerm - Search term for event name
 * @returns {Promise<Array>} - Resolves with an array of matching events
 */
const searchEventsByName = async (searchTerm) => {
    try {
        const allEvents = await getAllEvents();
        const searchLower = searchTerm.toLowerCase();
        const matchingEvents = allEvents.filter(event => 
            event.name.toLowerCase().includes(searchLower)
        );
        console.log(`🔍 Found ${matchingEvents.length} events matching "${searchTerm}"`);
        return matchingEvents;
    } catch (error) {
        console.error('Error searching events by name:', error);
        throw error;
    }
};

/**
 * @function purchaseTicketsFromClient
 * @description Purchases tickets through the client service
 * @param {number} eventId - Event ID
 * @param {number} ticketsToBook - Number of tickets to purchase
 * @returns {Promise<Object>} - Resolves with booking result
 */
const purchaseTicketsFromClient = async (eventId, ticketsToBook) => {
    try {
        console.log(`🎫 Purchasing ${ticketsToBook} tickets for event ${eventId} via client service`);
        
        // Make multiple purchase requests for the number of tickets needed
        // Since client service purchase endpoint currently decrements by 1
        const purchases = [];
        for (let i = 0; i < ticketsToBook; i++) {
            const response = await fetch(`${CLIENT_SERVICE_BASE_URL}/api/events/${eventId}/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Purchase failed (${response.status})`);
            }
            
            const result = await response.json();
            purchases.push(result);
        }
        
        // Return the final result
        const finalResult = purchases[purchases.length - 1];
        console.log(`✅ Successfully purchased ${ticketsToBook} tickets via client service`);
        
        return {
            success: true,
            event: finalResult.event,  // Extract the event object from the client service response
            ticketsBooked: ticketsToBook
        };
        
    } catch (error) {
        console.error('Error purchasing tickets from client service:', error);
        throw new Error('Failed to purchase tickets: ' + error.message);
    }
};

/**
 * @function parseBookingRequest
 * @description Uses LLM to parse natural language booking requests into structured data
 * @param {string} userInput - Natural language input from user
 * @param {Array} availableEvents - List of available events for context
 * @returns {Promise<Object>} - Structured booking data or error
 */
async function parseBookingRequest(userInput, availableEvents = []) {
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`\n🧠 [${requestId}] LLM PARSING started for: "${userInput}"`);
    
    try {
        // Create event context for the LLM
        const eventContext = availableEvents.length > 0 
            ? `Available events: ${availableEvents.map(e => `"${e.name}" (ID: ${e.id}, Available tickets: ${e.tickets})`).join(', ')}`
            : 'No events provided for context.';

        console.log(`📋 [${requestId}] Event context: ${eventContext}`);

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

        if (!openai) {
            console.log(`⚠️ [${requestId}] OpenAI not available, using fallback parser...`);
            return await fallbackParser(userInput, availableEvents);
        }

        console.log(`🚀 [${requestId}] Sending request to OpenAI GPT-4o-mini...`);
        const startTime = Date.now();
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userInput }
            ],
            temperature: 0.1,
            max_tokens: 200
        });

        const llmTime = Date.now() - startTime;
        console.log(`✅ [${requestId}] OpenAI responded in ${llmTime}ms`);
        
        const response = completion.choices[0].message.content.trim();
        console.log(`📄 [${requestId}] Raw LLM response: ${response}`);
        
        try {
            const parsed = JSON.parse(response);
            console.log(`✅ [${requestId}] Successfully parsed LLM JSON:`, JSON.stringify(parsed, null, 2));
            return { success: true, data: parsed };
        } catch (parseError) {
            console.error(`❌ [${requestId}] Failed to parse LLM response as JSON:`, response);
            console.log(`🔄 [${requestId}] Falling back to keyword parser...`);
            return await fallbackParser(userInput, availableEvents);
        }

    } catch (error) {
        console.error(`💥 [${requestId}] LLM service error:`, error.message);
        console.log(`🔄 [${requestId}] Falling back to keyword parser...`);
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
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log(`🔧 [${requestId}] FALLBACK PARSER processing: "${userInput}"`);
    
    const input = userInput.toLowerCase().trim();
    
    // Check for booking patterns first (before greeting)
    const bookingPatterns = ['book', 'buy', 'purchase', 'get', 'reserve'];
    const hasBookingIntent = bookingPatterns.some(pattern => input.includes(pattern));
    
    // Only check for greeting if no booking intent is detected
    if (!hasBookingIntent) {
        // Greeting patterns
        const greetingPatterns = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
        if (greetingPatterns.some(pattern => input.includes(pattern))) {
            console.log(`✅ [${requestId}] Detected greeting intent`);
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
    }

    // Show events patterns
    const showEventsPatterns = ['show events', 'list events', 'available events', 'what events', 'events'];
    if (showEventsPatterns.some(pattern => input.includes(pattern))) {
        console.log(`✅ [${requestId}] Detected show_events intent`);
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

    // Booking patterns (already checked above)
    
    if (hasBookingIntent) {
        console.log(`🎫 [${requestId}] Detected booking intent`);
        
        // Extract number of tickets
        const ticketMatch = input.match(/(\d+)\s*tickets?|tickets?\s*(\d+)|(\d+)/);
        const tickets = ticketMatch ? parseInt(ticketMatch[1] || ticketMatch[2] || ticketMatch[3]) : 1;
        console.log(`🔢 [${requestId}] Extracted ticket count: ${tickets}`);

        // Try to match event name with improved matching
        let matchedEvent = null;
        let eventId = null;
        
        console.log(`🔍 [${requestId}] Searching for event match in ${availableEvents.length} events...`);
        console.log(`🔍 [${requestId}] Available events:`, availableEvents.map(e => `"${e.name}" (ID: ${e.id})`));
        
        // Clean input for better matching
        const cleanInput = input.replace(/book|buy|purchase|get|reserve|\d+|tickets?/g, '').trim();
        console.log(`🔍 [${requestId}] Cleaned input for matching: "${cleanInput}"`);
        
        for (const event of availableEvents) {
            const eventName = event.name.toLowerCase();
            const eventWords = eventName.split(/\s+/);
            
            // Check for various matching patterns
            const matches = [
                input.includes(eventName),                    // Full event name in input
                eventName.includes(cleanInput),               // Cleaned input in event name
                cleanInput.includes(eventName),               // Event name in cleaned input
                eventWords.some(word => cleanInput.includes(word) && word.length > 2), // Any event word in input
                eventWords.some(word => input.includes(word) && word.length > 2)       // Any event word in original input
            ];
            
            if (matches.some(match => match)) {
                matchedEvent = event.name;
                eventId = event.id;
                console.log(`✅ [${requestId}] Found event match: "${matchedEvent}" (ID: ${eventId})`);
                break;
            }
        }

        if (!matchedEvent) {
            console.log(`❌ [${requestId}] No event match found in fallback parser`);
            console.log(`💡 [${requestId}] Try using keywords like: ${availableEvents.map(e => e.name.split(' ')[0]).join(', ')}`);
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
    console.log(`❓ [${requestId}] No intent detected - returning unknown`);
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
    console.log(`🎭 [GENERATE_RESPONSE] Processing ${parsedData.intent} intent for event: "${parsedData.event}" (ID: ${parsedData.eventId})`);
    console.log(`🎭 [GENERATE_RESPONSE] Available events: ${availableEvents.map(e => `"${e.name}" (ID: ${e.id})`).join(', ')}`);
    
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
            console.log(`\n🎫 ===== BOOKING CASE STARTED =====`);
            console.log(`🔍 [BOOKING] Checking booking request - Event: "${event}", EventId: ${eventId}, Tickets: ${tickets}`);
            console.log(`🔍 [BOOKING] Available events:`, availableEvents.map(e => `${e.name} (ID: ${e.id})`));
            console.log(`🎫 ===================================`);
            
            if (!event || !eventId) {
                console.log(`❌ [BOOKING] Missing event or eventId`);
                return {
                    message: "I'd like to help you book tickets, but I need to know which event you're interested in. Please specify the event name.",
                    actions: ['show_events'],
                    requiresConfirmation: false
                };
            }

            // Clean and sanitize the event data to ensure proper matching
            const cleanEventId = parseInt(eventId);
            const cleanEvent = event ? event.trim() : null;
            
            console.log(`🔍 [BOOKING] Raw inputs - EventId: ${eventId} (type: ${typeof eventId}), Event: "${event}"`);
            console.log(`🔍 [BOOKING] Sanitized inputs - EventId: ${cleanEventId} (type: ${typeof cleanEventId}), Event: "${cleanEvent}"`);
            console.log(`🔍 [BOOKING] Available events for lookup:`, availableEvents.map(e => `"${e.name}" (ID: ${e.id}, type: ${typeof e.id})`));
            
            // Try multiple lookup strategies
            let targetEvent = availableEvents.find(e => e.id === cleanEventId);
            
            if (!targetEvent && cleanEvent) {
                // Fallback: try finding by name if ID lookup fails
                targetEvent = availableEvents.find(e => 
                    e.name.toLowerCase().trim() === cleanEvent.toLowerCase().trim()
                );
                console.log(`🔄 [BOOKING] ID lookup failed, tried name lookup: ${targetEvent ? 'SUCCESS' : 'FAILED'}`);
            }
            
            console.log(`� [BOOKING] Final target event result:`, targetEvent ? `Found "${targetEvent.name}" (ID: ${targetEvent.id})` : 'Not found');
            
            if (!targetEvent) {
                console.log(`❌ [BOOKING] Event with ID ${eventId} not found in available events`);
                const debugInfo = {
                    searchingFor: { eventId, type: typeof eventId },
                    availableEvents: availableEvents.map(e => ({ id: e.id, type: typeof e.id, name: e.name })),
                    comparisons: availableEvents.map(e => ({ 
                        event: e.name, 
                        strictMatch: e.id === eventId, 
                        looseMatch: e.id == eventId 
                    }))
                };
                const debugMessage = `DEBUG: eventId=${eventId}(${typeof eventId}), cleanEventId=${cleanEventId}(${typeof cleanEventId}), availableCount=${availableEvents.length}`;
                return {
                    message: `Sorry, I couldn't find an event called "${event}". ${debugMessage}. Would you like to see available events?`,
                    actions: ['show_events'],
                    requiresConfirmation: false,
                    debug: debugInfo
                };
            }

            if (targetEvent.tickets < tickets) {
                return {
                    message: `Sorry, ${event} only has ${targetEvent.tickets} tickets available, but you requested ${tickets}. Would you like to book ${targetEvent.tickets} tickets instead?`,
                    actions: [],
                    requiresConfirmation: false
                };
            }

            // Return JSON formatted booking request without actually booking
            const bookingRequest = {
                action: "booking_request",
                event_details: {
                    event_id: eventId,
                    event_name: event,
                    event_date: targetEvent.date,
                    tickets_requested: tickets,
                    tickets_available: targetEvent.tickets,
                    price_per_ticket: targetEvent.price || "TBD"
                },
                request_summary: `Book ${tickets} ticket${tickets > 1 ? 's' : ''} for "${event}"`,
                confirmation_required: true,
                timestamp: new Date().toISOString()
            };

            const humanReadableBooking = `📅 Event: ${event}\n🎫 Tickets: ${tickets}\n📍 Date: ${targetEvent.date}\n💰 Price: ${targetEvent.price || "TBD"} per ticket\n🎪 Available: ${targetEvent.tickets} tickets remaining`;
            
            return {
                message: `I've prepared your booking request:\n\n${humanReadableBooking}\n\nWould you like me to proceed with this booking?`,
                actions: ['confirm_booking'],
                requiresConfirmation: true,
                bookingData: {
                    eventId: eventId,
                    eventName: event,
                    tickets: tickets,
                    date: targetEvent.date
                },
                bookingRequest: bookingRequest
            };

        default:
            return {
                message: "I'm sorry, I didn't understand that. I can help you:\n• View available events\n• Book tickets for events\n\nTry asking 'show events' or 'book 2 tickets for [event name]'.",
                actions: ['show_events'],
                requiresConfirmation: false
            };
    }
}

module.exports = {
    // Client service operations
    getAllEvents,
    getEventById,
    getAvailableEvents,
    searchEventsByName,
    purchaseTicketsFromClient,
    // LLM operations
    parseBookingRequest,
    generateChatResponse,
    fallbackParser
};