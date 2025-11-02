/**
 * @fileoverview Unit tests for Admin Service Controller
 */

const request = require('supertest');
const express = require('express');
const adminRoutes = require('../../routes/adminRoutes');
const { setupTestDatabase, cleanupTestDatabase } = require('../../__tests__/helpers/testDatabase');
const { mockEvents, validTestInputs, invalidTestInputs } = require('../../__tests__/helpers/mockData');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api', adminRoutes);

describe('Admin Service Controller', () => {
  let testDb;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    // Mock the database connection in the controller
    jest.doMock('../../models/adminModel', () => ({
      getDatabase: () => testDb
    }));
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDb);
  });

  describe('POST /api/events', () => {
    test('should create a new event with valid data', async () => {
      const response = await request(app)
        .post('/api/events')
        .send(validTestInputs.createEvent)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(validTestInputs.createEvent.name);
      expect(response.body.price).toBe(validTestInputs.createEvent.price);
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/events')
        .send(invalidTestInputs.createEvent.missing_name)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('name');
    });

    test('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .post('/api/events')
        .send(invalidTestInputs.createEvent.invalid_date)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('date');
    });

    test('should return 400 for negative ticket count', async () => {
      const response = await request(app)
        .post('/api/events')
        .send(invalidTestInputs.createEvent.negative_tickets)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('tickets');
    });
  });

  describe('GET /api/events', () => {
    test('should return all events', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check that each event has required properties
      response.body.forEach(event => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('date');
        expect(event).toHaveProperty('location');
        expect(event).toHaveProperty('price');
      });
    });

    test('should return events in correct format', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      const firstEvent = response.body[0];
      expect(typeof firstEvent.id).toBe('number');
      expect(typeof firstEvent.name).toBe('string');
      expect(typeof firstEvent.price).toBe('number');
      expect(typeof firstEvent.total_tickets).toBe('number');
    });
  });

  describe('GET /api/events/:id', () => {
    test('should return specific event by ID', async () => {
      const response = await request(app)
        .get('/api/events/1')
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
    });

    test('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/9999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('not found');
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/events/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('Invalid ID');
    });
  });

  describe('PATCH /api/events/:id/tickets', () => {
    test('should update ticket count for existing event', async () => {
      const updateData = { available_tickets: 500 };
      
      const response = await request(app)
        .patch('/api/events/1/tickets')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('available_tickets', 500);
      expect(response.body.message).toContain('updated');
    });

    test('should return 400 for invalid ticket count', async () => {
      const updateData = { available_tickets: -10 };
      
      const response = await request(app)
        .patch('/api/events/1/tickets')
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('negative');
    });

    test('should return 404 for non-existent event', async () => {
      const updateData = { available_tickets: 100 };
      
      const response = await request(app)
        .patch('/api/events/9999/tickets')
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/events/:id', () => {
    test('should delete existing event', async () => {
      // First create an event to delete
      const createResponse = await request(app)
        .post('/api/events')
        .send({
          ...validTestInputs.createEvent,
          name: 'Event to Delete'
        });

      const eventId = createResponse.body.id;

      // Then delete it
      const response = await request(app)
        .delete(`/api/events/${eventId}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');

      // Verify it's deleted
      await request(app)
        .get(`/api/events/${eventId}`)
        .expect(404);
    });

    test('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .delete('/api/events/9999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('not found');
    });

    test('should prevent deletion of event with bookings', async () => {
      // This test assumes business logic prevents deletion of events with bookings
      const response = await request(app)
        .delete('/api/events/1') // Event with existing bookings in test data
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('bookings');
    });
  });

  describe('Input Validation', () => {
    test('should sanitize HTML input', async () => {
      const maliciousInput = {
        ...validTestInputs.createEvent,
        name: '<script>alert("xss")</script>Test Event',
        description: '<img src="x" onerror="alert(1)">Description'
      };

      const response = await request(app)
        .post('/api/events')
        .send(maliciousInput)
        .expect(201);

      expect(response.body.name).not.toContain('<script>');
      expect(response.body.description).not.toContain('<img');
    });

    test('should validate date format', async () => {
      const invalidDates = ['2024-13-01', '2024-02-30', 'not-a-date'];

      for (const invalidDate of invalidDates) {
        const response = await request(app)
          .post('/api/events')
          .send({
            ...validTestInputs.createEvent,
            date: invalidDate
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    test('should validate time format', async () => {
      const invalidTimes = ['25:00', '12:70', 'not-a-time'];

      for (const invalidTime of invalidTimes) {
        const response = await request(app)
          .post('/api/events')
          .send({
            ...validTestInputs.createEvent,
            time: invalidTime
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Mock database error
      jest.doMock('../../models/adminModel', () => ({
        getDatabase: () => {
          throw new Error('Database connection failed');
        }
      }));

      const response = await request(app)
        .get('/api/events')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('server error');
    });

    test('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance', () => {
    test('should respond to GET /events within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/events')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle concurrent requests', async () => {
      const promises = Array(10).fill().map(() => 
        request(app).get('/api/events').expect(200)
      );

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });
});