# LLM-Driven Booking Microservice

A natural language processing microservice for TigerTix that enables users to book tickets using conversational language.

## Features

- **Natural Language Processing**: Uses OpenAI GPT-4o-mini to parse booking requests
- **Conversational Interface**: Supports greetings, event queries, and booking intents
- **Transaction Safety**: SQLite transactions prevent overselling
- **Fallback Parser**: Keyword-based parsing when LLM is unavailable
- **Error Handling**: Comprehensive error handling with user-friendly messages

## API Endpoints

### POST /api/llm/parse
Parse natural language booking requests into structured data.

**Request Body:**

```json
{
  "message": "I want to book 2 tickets for Jazz Night"
}
```

**Response:**

```json
{
  "success": true,
  "parsed": {
    "intent": "booking",
    "event": "Jazz Night",
    "eventId": 1,
    "tickets": 2,
    "confidence": "high",
    "message": "I'll help you book 2 tickets for Jazz Night."
  },
  "response": {
    "message": "Great! I can book 2 tickets for Jazz Night...",
    "requiresConfirmation": true,
    "bookingData": { ... }
  }
}
```

### POST /api/llm/confirm-booking

Confirm and process a booking with transaction safety.

**Request Body:**

```json
{
  "eventId": 1,
  "tickets": 2
}
```

**Response:**

```json
{
  "success": true,
  "message": "Successfully booked 2 tickets for Jazz Night!",
  "booking": {
    "eventId": 1,
    "eventName": "Jazz Night",
    "tickets": 2,
    "remainingTickets": 48
  }
}
```

### GET /api/llm/chat-history

Get chat conversation history (placeholder for future implementation).

## Setup

1. **Install Dependencies:**

   ```bash
   npm install
   ```

2. **Environment Variables:**

   ```bash
   export OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Start Service:**

   ```bash
   npm start
   ```

4. **Development Mode:**

   ```bash
   npm run dev
   ```

## Architecture

```
llm-driven-booking/
├── controllers/
│   └── llmController.js      # Request handling logic
├── models/
│   └── llmModel.js          # Database operations
├── routes/
│   └── llmRoutes.js         # API route definitions
├── services/
│   └── llmService.js        # LLM integration & parsing
├── server.js                # Express server setup
├── package.json             # Dependencies & scripts
└── README.md               # This file
```

## LLM Integration

The service uses OpenAI GPT-4o-mini for natural language understanding:

- **Model**: gpt-4o-mini (free tier compatible)
- **Temperature**: 0.1 (deterministic responses)
- **Max Tokens**: 200 (structured JSON responses)
- **Fallback**: Keyword-based parser for offline scenarios

## Transaction Safety

Booking confirmations use SQLite transactions:

```sql
BEGIN TRANSACTION;
-- Check ticket availability
-- Update ticket count
COMMIT; -- or ROLLBACK on error
```

This prevents overselling in concurrent booking scenarios.

## Supported Intents

1. **greeting**: "Hello", "Hi", "Good morning"
2. **show_events**: "Show events", "List events", "Available events"
3. **booking**: "Book 2 tickets for Jazz Night", "Buy tickets"
4. **unknown**: Fallback for unrecognized inputs

## Error Handling

- OpenAI API failures → Fallback parser
- Database errors → User-friendly messages
- Invalid inputs → Clear validation errors
- Transaction failures → Automatic rollback

## Dependencies

- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **sqlite3**: Database operations
- **openai**: LLM integration
- **nodemon**: Development auto-reload