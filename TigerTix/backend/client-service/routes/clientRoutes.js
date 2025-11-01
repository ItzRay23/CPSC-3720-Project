const express = require('express');
const router = express.Router();
const { listEvents, purchaseTickets } = require('../controllers/clientController');

/**
 * @route GET /events
 * @description Get all events for clients
 */
router.get('/events', (req, res, next) => {
    const requestSource = req.get('User-Agent')?.includes('node-fetch') ? 'LLM Service' : 'Frontend';
    console.log(`\n🌐 [CLIENT-ROUTE] GET /api/events requested by ${requestSource} at ${new Date().toISOString()}`);
    next();
}, listEvents);

/**
 * @route POST /events/:id/purchase
 * @description Purchase tickets for an event
 */
router.post('/events/:id/purchase', (req, res, next) => {
    const requestSource = req.get('User-Agent')?.includes('node-fetch') ? 'LLM Service' : 'Frontend';
    console.log(`\n🌐 [CLIENT-ROUTE] POST /api/events/${req.params.id}/purchase requested by ${requestSource} at ${new Date().toISOString()}`);
    next();
}, purchaseTickets);

module.exports = router;
