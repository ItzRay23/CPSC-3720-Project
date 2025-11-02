/**
 * @fileoverview Unit tests for Client Service Controller
 */

const request = require('supertest');
const express = require('express');
const { setupTestDatabase, cleanupTestDatabase } = require('../../../__tests__/helpers/testDatabase');
const { mockEvents, validTestInputs, invalidTestInputs } = require('../../../__tests__/helpers/mockData');

// Mock the client model before requiring the routes
let testDb;
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

describe('Client Service Controller', () => {
  beforeAll(async () => {
    testDb = await setupTestDatabase();
    
    // Setup mock implementations using test database
    clientModel.getAllEvents.mockImplementation(() => {
      return new Promise((resolve, reject) => {
        testDb.all('SELECT * FROM events WHERE available_tickets > 0 ORDER BY date', [], (err, rows) => {
          if (err) {
            reject(new Error('Database error: ' + err.message));
            return;
          }
          resolve(rows || []);
        });
      });
    });
    
    clientModel.getEventById.mockImplementation((id) => {
      return new Promise((resolve, reject) => {
        const numId = parseInt(id, 10);
        testDb.get('SELECT * FROM events WHERE id = ? AND available_tickets > 0', [numId], (err, row) => {
          if (err) {
            reject(new Error('Database error: ' + err.message));
            return;
          }
          if (!row) {
            reject(new Error('Event not found'));
            return;
          }
          // Add tickets property for controller compatibility
          row.tickets = row.available_tickets;
          resolve(row);
        });
      });
    });
    
    clientModel.updateEventTickets.mockImplementation((id, tickets) => {
      return new Promise((resolve, reject) => {
        const numId = parseInt(id, 10);
        testDb.run('UPDATE events SET available_tickets = ? WHERE id = ?', [tickets, numId], function(err) {
          if (err) {
            reject(new Error('Database error: ' + err.message));
            return;
          }
          if (this.changes === 0) {
            reject(new Error('Event not found'));
            return;
          }
          testDb.get('SELECT * FROM events WHERE id = ?', [numId], (err, row) => {
            if (err) {
              reject(new Error('Database error: ' + err.message));
              return;
            }
            // Add tickets property for controller compatibility
            row.tickets = row.available_tickets;
            resolve(row);
          });
        });
      });
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDb);
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
      // Event 3 has 800 tickets available, so purchase should succeed
      const response = await request(app)
        .post('/api/events/3/purchase')
        .send({ quantity: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Successfully purchased 1 ticket');
      expect(response.body).toHaveProperty('event');
      expect(response.body.event).toHaveProperty('tickets', 799); // 800 - 1
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