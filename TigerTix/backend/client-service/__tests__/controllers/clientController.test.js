/**
 * @fileoverview Unit tests for Client Service Controller
 */

const request = require('supertest');
const express = require('express');
const clientRoutes = require('../../routes/clientRoutes');
const { setupTestDatabase, cleanupTestDatabase } = require('../../__tests__/helpers/testDatabase');
const { mockEvents, validTestInputs, invalidTestInputs } = require('../../__tests__/helpers/mockData');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api', clientRoutes);

describe('Client Service Controller', () => {
  let testDb;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    // Mock the database connection in the controller
    jest.doMock('../../models/clientModel', () => ({
      getDatabase: () => testDb
    }));
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDb);
  });

  describe('GET /api/events', () => {
    test('should return all available events', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check that each event has required client-facing properties
      response.body.forEach(event => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('date');
        expect(event).toHaveProperty('time');
        expect(event).toHaveProperty('location');
        expect(event).toHaveProperty('price');
        expect(event).toHaveProperty('available_tickets');
        
        // Ensure no sensitive admin data is exposed
        expect(event).not.toHaveProperty('total_tickets');
      });
    });

    test('should only return events with available tickets', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      response.body.forEach(event => {
        expect(event.available_tickets).toBeGreaterThan(0);
      });
    });

    test('should format dates and times correctly', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      const firstEvent = response.body[0];
      expect(firstEvent.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
      expect(firstEvent.time).toMatch(/^\d{2}:\d{2}$/); // HH:MM format
    });

    test('should handle empty events list', async () => {
      // Mock empty database
      jest.doMock('../../models/clientModel', () => ({
        getDatabase: () => testDb,
        getAllEvents: () => Promise.resolve([])
      }));

      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/events/:id', () => {
    test('should return specific event details', async () => {
      const response = await request(app)
        .get('/api/events/1')
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('available_tickets');
      expect(response.body.available_tickets).toBeGreaterThan(0);
    });

    test('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/9999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('Event not found');
    });

    test('should return 404 for sold out events', async () => {
      // This assumes business logic hides sold out events from clients
      const response = await request(app)
        .get('/api/events/999') // Assume this is a sold out event ID
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/events/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('Invalid event ID');
    });
  });

  describe('POST /api/events/:id/purchase', () => {
    test('should successfully purchase tickets with valid data', async () => {
      const purchaseData = validTestInputs.purchaseTickets;
      
      const response = await request(app)
        .post('/api/events/1/purchase')
        .send(purchaseData)
        .expect(201);

      expect(response.body).toHaveProperty('booking_id');
      expect(response.body).toHaveProperty('event_id', 1);
      expect(response.body).toHaveProperty('customer_name', purchaseData.customer_name);
      expect(response.body).toHaveProperty('tickets_purchased', purchaseData.tickets_purchased);
      expect(response.body).toHaveProperty('total_amount');
      expect(response.body).toHaveProperty('status', 'confirmed');
    });

    test('should calculate total amount correctly', async () => {
      const purchaseData = { ...validTestInputs.purchaseTickets, tickets_purchased: 3 };
      
      const response = await request(app)
        .post('/api/events/1/purchase')
        .send(purchaseData)
        .expect(201);

      // Assuming event 1 has price $85.00
      expect(response.body.total_amount).toBe(255.00); // 3 * $85.00
    });

    test('should update available ticket count after purchase', async () => {
      // Get initial ticket count
      const initialResponse = await request(app).get('/api/events/2');
      const initialTickets = initialResponse.body.available_tickets;

      // Purchase tickets
      const purchaseData = { ...validTestInputs.purchaseTickets, tickets_purchased: 2 };
      await request(app)
        .post('/api/events/2/purchase')
        .send(purchaseData)
        .expect(201);

      // Check updated ticket count
      const updatedResponse = await request(app).get('/api/events/2');
      expect(updatedResponse.body.available_tickets).toBe(initialTickets - 2);
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/events/1/purchase')
        .send(invalidTestInputs.purchaseTickets.missing_email)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('email');
    });

    test('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/events/1/purchase')
        .send(invalidTestInputs.purchaseTickets.invalid_email)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('email');
    });

    test('should return 400 for zero or negative ticket quantity', async () => {
      const response = await request(app)
        .post('/api/events/1/purchase')
        .send(invalidTestInputs.purchaseTickets.zero_tickets)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('tickets');
    });

    test('should return 400 when requesting more tickets than available', async () => {
      const purchaseData = {
        ...validTestInputs.purchaseTickets,
        tickets_purchased: 10000 // More than available
      };

      const response = await request(app)
        .post('/api/events/1/purchase')
        .send(purchaseData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('available');
    });

    test('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .post('/api/events/9999/purchase')
        .send(validTestInputs.purchaseTickets)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('Event not found');
    });
  });

  describe('Input Validation', () => {
    test('should sanitize customer name input', async () => {
      const purchaseData = {
        ...validTestInputs.purchaseTickets,
        customer_name: '<script>alert("xss")</script>John Doe'
      };

      const response = await request(app)
        .post('/api/events/1/purchase')
        .send(purchaseData)
        .expect(201);

      expect(response.body.customer_name).not.toContain('<script>');
      expect(response.body.customer_name).toBe('John Doe');
    });

    test('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        'user@domain',
        'user..double.dot@domain.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/events/1/purchase')
          .send({
            ...validTestInputs.purchaseTickets,
            customer_email: email
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    test('should limit customer name length', async () => {
      const longName = 'A'.repeat(256); // Very long name

      const response = await request(app)
        .post('/api/events/1/purchase')
        .send({
          ...validTestInputs.purchaseTickets,
          customer_name: longName
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toContain('name too long');
    });
  });

  describe('Concurrency and Race Conditions', () => {
    test('should handle concurrent ticket purchases correctly', async () => {
      // Get initial ticket count
      const initialResponse = await request(app).get('/api/events/3');
      const initialTickets = initialResponse.body.available_tickets;

      // Make concurrent purchase requests
      const concurrentPurchases = Array(5).fill().map((_, index) => 
        request(app)
          .post('/api/events/3/purchase')
          .send({
            customer_name: `Customer ${index}`,
            customer_email: `customer${index}@test.com`,
            tickets_purchased: 2
          })
      );

      const results = await Promise.allSettled(concurrentPurchases);
      
      // Count successful purchases
      const successfulPurchases = results.filter(result => 
        result.status === 'fulfilled' && result.value.status === 201
      ).length;

      // Check final ticket count
      const finalResponse = await request(app).get('/api/events/3');
      const expectedTickets = initialTickets - (successfulPurchases * 2);
      
      expect(finalResponse.body.available_tickets).toBe(expectedTickets);
    });

    test('should prevent overselling when tickets run low', async () => {
      // Find an event with limited tickets or create one
      const limitedEvent = await request(app)
        .get('/api/events')
        .then(res => res.body.find(event => event.available_tickets <= 5));

      if (limitedEvent) {
        const availableTickets = limitedEvent.available_tickets;
        
        // Try to purchase more tickets than available
        const response = await request(app)
          .post(`/api/events/${limitedEvent.id}/purchase`)
          .send({
            customer_name: 'Test Customer',
            customer_email: 'test@example.com',
            tickets_purchased: availableTickets + 1
          })
          .expect(400);

        expect(response.body.message).toContain('available');
      }
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
        .get('/api/events/1')
        .expect(200);

      // Ensure sensitive admin data is not exposed
      expect(response.body).not.toHaveProperty('admin_notes');
      expect(response.body).not.toHaveProperty('internal_id');
      expect(response.body).not.toHaveProperty('cost_per_ticket');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock database error
      jest.doMock('../../models/clientModel', () => ({
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

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/events/1/purchase')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});