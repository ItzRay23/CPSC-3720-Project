const express = require('express');
const router = express.Router();
const { listEvents, purchaseTickets } = require('../controllers/clientController');

// GET /api/events
router.get('/events', listEvents);

// POST /api/events/:id/purchase
router.post('/events/:id/purchase', purchaseTickets);

module.exports = router;
