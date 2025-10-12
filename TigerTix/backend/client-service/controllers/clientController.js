const { getAllEvents, getEventById, updateEventTickets } = require('../models/clientModel');

// GET /api/events
const listEvents = async (req, res) => {
  try {
    const events = await getAllEvents();
    res.json({
      message: 'Events fetched successfully',
      events: events
    });
  } catch (err) {
    console.error('Error listing events:', err);
    res.status(500).json({
      message: 'Failed to fetch events',
      error: err.message || 'Unknown error'
    });
  }
};

// POST /api/events/:id/purchase
// Body: { quantity: number }
const purchaseTickets = async (req, res) => {
  const eventId = parseInt(req.params.id);
  const quantity = parseInt(req.body.quantity) || 1;

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({
      message: 'Invalid event ID',
      error: 'Event ID must be a positive integer'
    });
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      message: 'Invalid quantity',
      error: 'Quantity must be a positive integer'
    });
  }

  try {
    // Fetch event
    const event = await getEventById(eventId);
    if (!event) return res.status(404).json({
      message: 'Event not found',
      error: 'No event with the provided ID'
    });

    if (event.tickets < quantity) {
      return res.status(400).json({
        message: 'Not enough tickets available',
        availableTickets: event.tickets
      });
    }

    // Update tickets
    const updated = await updateEventTickets(eventId, event.tickets - quantity);
    res.json({
      message: `Successfully purchased ${quantity} ticket${quantity > 1 ? 's' : ''}`,
      event: updated
    });
  } catch (err) {
    console.error('Error purchasing tickets:', err);
    if (err.message === 'Event not found') return res.status(404).json({
      message: 'Event not found',
      error: 'No event with the provided ID'
    });
    res.status(500).json({
      message: 'Failed to process purchase',
      error: err.message || 'Unknown error'
    });
  }
};

module.exports = { listEvents, purchaseTickets };
