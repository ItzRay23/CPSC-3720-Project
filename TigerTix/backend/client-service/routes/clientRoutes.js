const express = require('express');
const router = express.Router();
const { listEvents, purchaseTickets } = require('../controllers/clientController');

/**
 * @route GET /events
 * @description Get all events for clients
 */
router.get('/events', listEvents);

/**
 * @route POST /events/:id/purchase
 * @description Purchase tickets for an event
 */
router.post('/events/:id/purchase', purchaseTickets);

module.exports = router;
