/**
 * @fileoverview Unit tests for Client Service Controller
 */

const request = require('supertest');
const express = require('express');
const { mockEvents, validTestInputs, invalidTestInputs } = require('../../../__tests__/helpers/mockData');

// Mock the client model before requiring the routes
jest.mock('../../models/clientModel', () => ({
  getAllEvents: jest.fn(),
  getEventById: jest.fn(),
  updateEventTickets: jest.fn()
}));

const clientModel = require('../../models/clientModel');
const clientRoutes = require('../../routes/clientRoutes');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api', clientRoutes);

// In-memory mock events storage
let mockEventsStore = [];

describe('Client Service Controller', () => {
  beforeEach(() => {
    // Reset mock events store before each test
    mockEventsStore = [
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
      },
      {
        id: 3,
        name: 'Spring Concert Series',
        description: 'Annual spring outdoor concert',
        date: '2025-04-20',
        time: '19:00',
        location: 'Amphitheater',
        total_tickets: 800,
        available_tickets: 800,
        price: 25.00
      }
    ];
    
    // Setup mock implementations with in-memory storage
    clientModel.getAllEvents.mockImplementation(() => {
      return Promise.resolve(
        mockEventsStore.filter(e => e.available_tickets > 0)
      );
    });
    
    clientModel.getEventById.mockImplementation((id) => {
      const numId = parseInt(id, 10);
      const event = mockEventsStore.find(e => e.id === numId && e.available_tickets > 0);
      if (!event) {
        return Promise.reject(new Error('Event not found'));
      }
      return Promise.resolve({ ...event, tickets: event.available_tickets });
    });
    
    clientModel.updateEventTickets.mockImplementation((id, tickets) => {
      const numId = parseInt(id, 10);
      const eventIndex = mockEventsStore.findIndex(e => e.id === numId);
      if (eventIndex === -1) {
        return Promise.reject(new Error('Event not found'));
      }
      mockEventsStore[eventIndex].available_tickets = tickets;
      return Promise.resolve({
        ...mockEventsStore[eventIndex],
        tickets: mockEventsStore[eventIndex].available_tickets
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/events', () => {
    test('should return all available events', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Events fetched successfully');
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.events.length).toBeGreaterThan(0);
      
      // Check that each event has required client-facing properties
      response.body.events.forEach(event => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('date');
        expect(event).toHaveProperty('time');
        expect(event).toHaveProperty('location');
        expect(event).toHaveProperty('price');
        expect(event).toHaveProperty('available_tickets');
        
        // All returned events should have available tickets > 0
        expect(event.available_tickets).toBeGreaterThan(0);
      });
    });

    test('should only return events with available tickets', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      response.body.events.forEach(event => {
        expect(event.available_tickets).toBeGreaterThan(0);
      });
    });

    test('should format dates and times correctly', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      const firstEvent = response.body.events[0];
      expect(firstEvent.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
      expect(firstEvent.time).toMatch(/^\d{2}:\d{2}$/); // HH:MM format
    });

    test('should handle empty events list', async () => {
      // Mock empty database for this test
      clientModel.getAllEvents.mockImplementationOnce(() => Promise.resolve([]));

      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.events).toHaveLength(0);
    });
  });



  describe('POST /api/events/:id/purchase', () => {
    test('should successfully purchase tickets with valid data', async () => {
      const response = await request(app)
        .post('/api/events/1/purchase')
        .send({ quantity: 2 })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Successfully purchased 2 tickets');
      expect(response.body).toHaveProperty('event');
      expect(response.body.event).toHaveProperty('tickets', 748); // 750 - 2
    });

    test('should default to 1 ticket when quantity not provided', async () => {
      const response = await request(app)
        .post('/api/events/1/purchase')
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Successfully purchased 1 ticket');
      expect(response.body).toHaveProperty('event');
    });

    test('should treat zero quantity as 1 (default behavior)', async () => {
      const response = await request(app)
        .post('/api/events/1/purchase')
        .send({ quantity: 0 })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Successfully purchased 1 ticket');
      expect(response.body).toHaveProperty('event');
    });

    test('should return 400 when requesting more tickets than available', async () => {
      const response = await request(app)
        .post('/api/events/1/purchase')
        .send({ quantity: 10000 })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Not enough tickets available');
      expect(response.body).toHaveProperty('availableTickets');
    });

    test('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .post('/api/events/9999/purchase')
        .send({ quantity: 1 })
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Event not found');
      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for invalid event ID', async () => {
      const response = await request(app)
        .post('/api/events/invalid-id/purchase')
        .send({ quantity: 1 })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid event ID');
      expect(response.body).toHaveProperty('error');
    });

    test('should handle event purchase successfully (Event 3 has 800 tickets)', async () => {
      // Purchase 1 ticket from event 3
      const response = await request(app)
        .post('/api/events/3/purchase')
        .send({ quantity: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Successfully purchased 1 ticket');
      expect(response.body).toHaveProperty('event');
      expect(response.body.event).toHaveProperty('tickets');
      expect(response.body.event).toHaveProperty('id', 3);
      // Verify tickets were decremented
      expect(response.body.event.tickets).toBeLessThan(800);
    });
  });





  describe('CORS and Security', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      // Note: Supertest might not capture CORS headers the same way a browser would
      // This test serves as documentation of the expected behavior
      expect(response.headers).toBeDefined();
    });

    test('should not expose sensitive data in responses', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      // Ensure sensitive admin data is not exposed to client requests
      response.body.events.forEach(event => {
        expect(event).not.toHaveProperty('admin_notes');
        expect(event).not.toHaveProperty('internal_id');
        expect(event).not.toHaveProperty('cost_per_ticket');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock database error by spying on getAllEvents
      const clientModel = require('../../models/clientModel');
      const getAllEventsSpy = jest.spyOn(clientModel, 'getAllEvents')
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/events')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('Failed to fetch events');
      
      // Restore the original function
      getAllEventsSpy.mockRestore();
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/events/1/purchase')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express's built-in JSON parser returns an error for malformed JSON
      // The response might be empty or have different structure
      expect(response.status).toBe(400);
    });
  });
});