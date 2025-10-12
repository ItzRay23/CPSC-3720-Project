const express = require('express');
const router = express.Router();
const {
    createEvent,
    getEvents,
    getEvent,
    updateTickets
} = require('../controllers/adminController');

// Event routes
router.post('/events', createEvent);            // Create new event
router.get('/events', getEvents);               // Get all events
router.get('/events/:id', getEvent);            // Get specific event
router.patch('/events/:id/tickets', updateTickets);  // Update ticket count

module.exports = router;
