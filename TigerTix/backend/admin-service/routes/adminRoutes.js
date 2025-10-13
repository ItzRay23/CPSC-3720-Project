const express = require('express');
const router = express.Router();
const {
    createEvent,
    getEvents,
    getEvent,
    updateTickets,
    deleteEvent
} = require('../controllers/adminController');

// Event routes
router.post('/events', createEvent);            // Create new event
router.get('/events', getEvents);               // Get all events
router.get('/events/:id', getEvent);            // Get specific event
router.patch('/events/:id/tickets', updateTickets);  // Update ticket count
router.delete('/events/:id', deleteEvent);      // Delete an event

module.exports = router;
