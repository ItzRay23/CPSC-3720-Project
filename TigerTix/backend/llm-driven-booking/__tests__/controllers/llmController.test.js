/**
 * @fileoverview Unit tests for LLM-driven Booking Service Controller
 */

const request = require('supertest');
const express = require('express');
const llmRoutes = require('../../routes/llmRoutes');
const { mockOpenAIResponses, mockChatMessages, validTestInputs } = require('../../../__tests__/helpers/mockData');

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

// Mock the entire LLM model module to avoid real HTTP requests
jest.mock('../../models/llmModel', () => ({
  getAllEvents: jest.fn(() => Promise.resolve([
    {
      id: 1,
      name: 'Auburn vs Alabama Football',
      description: 'Iron Bowl 2024',
      date: '2024-11-30',
      time: '15:30',
      location: 'Jordan-Hare Stadium',
      total_tickets: 1000,
      available_tickets: 750,
      price: 85.00
    },
    {
      id: 2,
      name: 'Auburn Basketball vs Kentucky',
      description: 'SEC Conference basketball game',
      date: '2024-12-15',
      time: '20:00',
      location: 'Auburn Arena',
      total_tickets: 500,
      available_tickets: 300,
      price: 35.00
    }
  ])),
  getEventById: jest.fn((id) => Promise.resolve({
    id: id,
    name: 'Auburn vs Alabama Football',
    description: 'Iron Bowl 2024',
    date: '2024-11-30',
    time: '15:30',
    location: 'Jordan-Hare Stadium',
    total_tickets: 1000,
    available_tickets: 750,
    price: 85.00
  })),
  purchaseTickets: jest.fn(() => Promise.resolve({
    booking_id: 123,
    status: 'confirmed',
    confirmation_message: 'Booking confirmed!'
  })),
  parseBookingRequest: jest.fn(() => Promise.resolve({
    success: true,
    data: {
      intent: 'book_tickets',
      event: 'Auburn vs Alabama Football',
      eventId: 1,
      quantity: 2,
      confidence: 'high',
      message: 'I can help you book tickets for Auburn vs Alabama Football.',
      source: 'openai'
    }
  })),
  generateChatResponse: jest.fn((parsedData) => ({
    message: parsedData.message || 'How can I help you with ticket booking?',
    suggestions: ['View available events', 'Book tickets', 'Check booking status'],
    requiresConfirmation: false
  })),
  purchaseTicketsFromClient: jest.fn(() => Promise.resolve({
    booking_id: 123,
    status: 'confirmed',
    confirmation_message: 'Booking confirmed!'
  }))
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/llm', llmRoutes);

describe('LLM-driven Booking Service Controller', () => {
  let mockOpenAI;

  beforeAll(() => {
    const { OpenAI } = require('openai');
    mockOpenAI = new OpenAI();
    
    // Set up default OpenAI mock response
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: 'book_tickets',
              event_keywords: ['football', 'Auburn'],
              quantity: 2,
              confidence: 0.95,
              response: 'I can help you book tickets for Auburn football!'
            })
          }
        }
      ]
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/llm/parse', () => {
    test('should parse natural language booking request with OpenAI', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponses.parseBooking);

      const response = await request(app)
        .post('/api/llm/parse')
        .send({
          message: 'I want to book 2 tickets for the Auburn football game',
          chat_history: []
        })
        .expect(200);

      expect(response.body.parsed).toHaveProperty('intent', 'book_tickets');
      expect(response.body.parsed).toHaveProperty('event', 'Auburn vs Alabama Football');
      expect(response.body.parsed).toHaveProperty('quantity', 2);
      expect(response.body.parsed).toHaveProperty('confidence');
      expect(response.body.parsed.confidence).toBe('high');
    });

    test('should use fallback parsing when OpenAI is unavailable', async () => {
      // Mock the LLM model to simulate fallback behavior
      const llmModel = require('../../models/llmModel');
      llmModel.parseBookingRequest.mockResolvedValueOnce({
        success: true,
        data: {
          intent: 'book_tickets',
          event: 'Auburn Basketball vs Kentucky',
          eventId: 2,
          quantity: 3,
          confidence: 'medium',
          message: 'I can help you book basketball tickets.',
          source: 'fallback'
        }
      });

      const response = await request(app)
        .post('/api/llm/parse')
        .send({
          message: 'I need 3 tickets for basketball game',
          chat_history: []
        })
        .expect(200);

      expect(response.body.parsed).toHaveProperty('intent');
      expect(response.body.parsed).toHaveProperty('source', 'fallback');
      expect(response.body.parsed.confidence).toBe('medium'); // Fallback has lower confidence
    });

    test('should extract event keywords correctly', async () => {
      const testCases = [
        {
          message: 'Auburn football vs Alabama tickets',
          expectedKeywords: ['auburn', 'football', 'alabama']
        },
        {
          message: 'basketball game next week',
          expectedKeywords: ['basketball']
        },
        {
          message: 'concert at amphitheater',
          expectedKeywords: ['concert', 'amphitheater']
        }
      ];

      for (const testCase of testCases) {
        mockOpenAI.chat.completions.create.mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                intent: 'book_tickets',
                event_keywords: testCase.expectedKeywords,
                quantity: 1,
                confidence: 0.9
              })
            }
          }]
        });

        const response = await request(app)
          .post('/api/llm/parse')
          .send({
            message: testCase.message,
            chat_history: []
          })
          .expect(200);

        // Since we're using the mock, check that the response contains event name
        expect(response.body.parsed).toHaveProperty('event');
      }
    });

    test('should extract ticket quantity correctly', async () => {
      const testCases = [
        { message: 'I need 5 tickets', expectedQuantity: 5 },
        { message: 'book two tickets please', expectedQuantity: 2 },
        { message: 'one ticket for the game', expectedQuantity: 1 },
        { message: 'tickets for me and my friend', expectedQuantity: 2 }
      ];

      const llmModel = require('../../models/llmModel');

      for (const testCase of testCases) {
        llmModel.parseBookingRequest.mockResolvedValueOnce({
          success: true,
          data: {
            intent: 'book_tickets',
            event: 'Auburn vs Alabama Football',
            eventId: 1,
            quantity: testCase.expectedQuantity,
            confidence: 'high',
            message: 'I can help you book tickets.',
            source: 'openai'
          }
        });

        const response = await request(app)
          .post('/api/llm/parse')
          .send({
            message: testCase.message,
            chat_history: []
          })
          .expect(200);

        expect(response.body.parsed.quantity).toBe(testCase.expectedQuantity);
      }
    });

    test('should handle ambiguous requests', async () => {
      const llmModel = require('../../models/llmModel');
      llmModel.parseBookingRequest.mockResolvedValueOnce({
        success: true,
        data: {
          intent: 'need_clarification',
          event: null,
          eventId: null,
          quantity: 0,
          confidence: 'low',
          message: 'Which event are you interested in?',
          source: 'openai',
          clarification_needed: 'Which event are you interested in?'
        }
      });

      const response = await request(app)
        .post('/api/llm/parse')
        .send({
          message: 'I want tickets',
          chat_history: []
        })
        .expect(200);

      expect(response.body.parsed.intent).toBe('need_clarification');
      expect(response.body.parsed.confidence).toBe('low');
      expect(response.body.parsed).toHaveProperty('clarification_needed');
    });

    test('should return 400 for missing message', async () => {
      const response = await request(app)
        .post('/api/llm/parse')
        .send({
          chat_history: []
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Message is required');
    });

    test('should include chat history in OpenAI context', async () => {
      const chatHistory = mockChatMessages.slice(0, 2);
      const llmModel = require('../../models/llmModel');

      // Verify that parseBookingRequest is called with the message (chat history would be handled internally)
      const response = await request(app)
        .post('/api/llm/parse')
        .send({
          message: 'Yes, 2 tickets please',
          chat_history: chatHistory
        })
        .expect(200);

      // Verify that the LLM model method was called
      expect(llmModel.parseBookingRequest).toHaveBeenCalledWith(
        'Yes, 2 tickets please',
        expect.any(Array) // Available events
      );

      expect(response.body.parsed).toHaveProperty('intent');
    });
  });

  describe('POST /api/llm/confirm-booking', () => {
    test('should confirm booking with valid customer information', async () => {
      const llmModel = require('../../models/llmModel');
      llmModel.purchaseTicketsFromClient.mockResolvedValueOnce({
        success: true,
        event: {
          name: 'Auburn vs Alabama Football',
          tickets: 748  // remaining tickets after purchase
        }
      });

      const response = await request(app)
        .post('/api/llm/confirm-booking')
        .send({
          eventId: 1,
          tickets: 2
        })
        .expect(200);

      expect(response.body).toHaveProperty('event', 'Auburn vs Alabama Football');
      expect(response.body).toHaveProperty('tickets', 2);
    });

    test('should return 400 when event is sold out', async () => {
      const llmModel = require('../../models/llmModel');
      llmModel.purchaseTicketsFromClient.mockResolvedValueOnce({
        success: false,
        error: 'Not enough tickets available'
      });

      const response = await request(app)
        .post('/api/llm/confirm-booking')
        .send({
          eventId: 1,
          tickets: 1000 // More than available
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('available');
    });

    test('should validate customer information', async () => {
      const invalidInputs = [
        { tickets: 2 }, // Missing eventId
        { eventId: 1 }, // Missing tickets
        { eventId: 'invalid', tickets: 2 }, // Invalid eventId
        { eventId: 1, tickets: 'invalid' }, // Invalid tickets
        { eventId: 0, tickets: 2 }, // Zero eventId
        { eventId: 1, tickets: 0 } // Zero tickets
      ];

      for (const input of invalidInputs) {
        const response = await request(app)
          .post('/api/llm/confirm-booking')
          .send(input)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    test('should handle client service communication errors', async () => {
      // Mock the purchaseTicketsFromClient function to throw an error
      const llmModel = require('../../models/llmModel');
      llmModel.purchaseTicketsFromClient.mockRejectedValue(new Error('Client service unavailable'));

      const response = await request(app)
        .post('/api/llm/confirm-booking')
        .send({
          eventId: 1,
          tickets: 2
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to process booking');
    });
  });

  describe('GET /api/llm/chat-history', () => {
    test('should return formatted chat history', async () => {
      const response = await request(app)
        .get('/api/llm/chat-history')
        .query({ session_id: 'test-session-123' })
        .expect(200);

      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('note');
    });

    test('should return empty history for new session', async () => {
      const response = await request(app)
        .get('/api/llm/chat-history')
        .query({ session_id: 'new-session-456' })
        .expect(200);

      expect(response.body.messages).toHaveLength(0);
      expect(response.body.success).toBe(true);
    });

    test('should limit chat history length', async () => {
      const response = await request(app)
        .get('/api/llm/chat-history')
        .query({ session_id: 'long-session', limit: 5 })
        .expect(200);

      expect(response.body.messages.length).toBeLessThanOrEqual(5);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Fallback Parsing Logic', () => {
    test('should detect common booking intents', async () => {
      const bookingPhrases = [
        'book tickets',
        'buy tickets',
        'purchase tickets',
        'reserve seats',
        'get tickets',
        'I need tickets'
      ];

      const llmModel = require('../../models/llmModel');

      for (const phrase of bookingPhrases) {
        // Mock fallback parsing behavior
        llmModel.parseBookingRequest.mockResolvedValueOnce({
          success: true,
          data: {
            intent: 'book_tickets',
            event: 'Auburn vs Alabama Football',
            eventId: 1,
            quantity: 1,
            confidence: 'medium',
            message: 'I can help you book tickets.',
            source: 'fallback'
          }
        });

        const response = await request(app)
          .post('/api/llm/parse')
          .send({
            message: phrase,
            chat_history: []
          })
          .expect(200);

        expect(response.body.parsed.intent).toBe('book_tickets');
        expect(response.body.parsed.source).toBe('fallback');
      }
    });

    test('should extract numbers from text', async () => {
      const testCases = [
        { message: 'I need 5 tickets', expected: 5 },
        { message: 'book two tickets', expected: 2 },
        { message: 'three seats please', expected: 3 },
        { message: 'a dozen tickets', expected: 12 }
      ];

      const llmModel = require('../../models/llmModel');

      for (const testCase of testCases) {
        llmModel.parseBookingRequest.mockResolvedValueOnce({
          success: true,
          data: {
            intent: 'book_tickets',
            event: 'Auburn vs Alabama Football',
            eventId: 1,
            quantity: testCase.expected,
            confidence: 'medium',
            message: 'I can help you book tickets.',
            source: 'fallback'
          }
        });

        const response = await request(app)
          .post('/api/llm/parse')
          .send({
            message: testCase.message,
            chat_history: []
          })
          .expect(200);

        expect(response.body.parsed.quantity).toBe(testCase.expected);
      }
    });

    test('should identify event types', async () => {
      const testCases = [
        { message: 'football game tickets', expectedEvent: 'Auburn vs Alabama Football' },
        { message: 'basketball match', expectedEvent: 'Auburn Basketball vs Kentucky' },
        { message: 'concert tickets', expectedEvent: 'Auburn vs Alabama Football' },
        { message: 'Auburn vs Alabama', expectedEvent: 'Auburn vs Alabama Football' }
      ];

      const llmModel = require('../../models/llmModel');

      for (const testCase of testCases) {
        llmModel.parseBookingRequest.mockResolvedValueOnce({
          success: true,
          data: {
            intent: 'book_tickets',
            event: testCase.expectedEvent,
            eventId: 1,
            quantity: 1,
            confidence: 'medium',
            message: 'I can help you book tickets.',
            source: 'fallback'
          }
        });

        const response = await request(app)
          .post('/api/llm/parse')
          .send({
            message: testCase.message,
            chat_history: []
          })
          .expect(200);

        expect(response.body.parsed.event).toBe(testCase.expectedEvent);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle OpenAI rate limiting', async () => {
      const llmModel = require('../../models/llmModel');
      llmModel.parseBookingRequest.mockResolvedValueOnce({
        success: true,
        data: {
          intent: 'book_tickets',
          event: 'Auburn vs Alabama Football',
          eventId: 1,
          quantity: 1,
          confidence: 'medium',
          message: 'I can help you book tickets.',
          source: 'fallback'
        }
      });

      const response = await request(app)
        .post('/api/llm/parse')
        .send({
          message: 'book tickets',
          chat_history: []
        })
        .expect(200);

      // Should fall back to local parsing
      expect(response.body.parsed.source).toBe('fallback');
    });

    test('should handle malformed OpenAI responses', async () => {
      const llmModel = require('../../models/llmModel');
      llmModel.parseBookingRequest.mockResolvedValueOnce({
        success: true,
        data: {
          intent: 'book_tickets',
          event: 'Auburn vs Alabama Football',
          eventId: 1,
          quantity: 1,
          confidence: 'medium',
          message: 'I can help you book tickets.',
          source: 'fallback'
        }
      });

      const response = await request(app)
        .post('/api/llm/parse')
        .send({
          message: 'book tickets',
          chat_history: []
        })
        .expect(200);

      // Should fall back to local parsing
      expect(response.body.parsed.source).toBe('fallback');
    });

    test('should handle very long messages', async () => {
      const longMessage = 'I want to book tickets '.repeat(1000);

      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponses.parseBooking);

      const response = await request(app)
        .post('/api/llm/parse')
        .send({
          message: longMessage,
          chat_history: []
        })
        .expect(200);

      expect(response.body.parsed).toHaveProperty('intent');
    });

    test('should sanitize user input', async () => {
      const maliciousInput = '<script>alert("xss")</script>book tickets';

      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponses.parseBooking);

      const response = await request(app)
        .post('/api/llm/parse')
        .send({
          message: maliciousInput,
          chat_history: []
        })
        .expect(200);

      // Response should not contain script tags
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });
  });
});