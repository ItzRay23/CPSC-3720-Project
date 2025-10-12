const { addEvent, getAllEvents, getEventById, updateEventTickets } = require('../models/adminModel');

// Validation functions
const validateEventData = (eventData) => {
    const errors = [];
    
    // Validate name
    if (!eventData.name || typeof eventData.name !== 'string' || eventData.name.trim().length === 0) {
        errors.push('Event name is required and must be a non-empty string');
    }

    // Validate date
    if (!eventData.date) {
        errors.push('Event date is required');
    } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(eventData.date)) {
            errors.push('Event date must be in YYYY-MM-DD format');
        } else {
            // Validate date is not in the past
            const eventDate = new Date(eventData.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (eventDate < today) {
                errors.push('Event date cannot be in the past');
            }
        }
    }

    // Validate tickets
    if (!Number.isInteger(eventData.tickets) || eventData.tickets < 0) {
        errors.push('Number of tickets must be a positive integer');
    }

    return errors;
};

const validateId = (id) => {
    if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
        return 'Invalid event ID';
    }
    return null;
};

const validateTickets = (tickets) => {
    if (!Number.isInteger(Number(tickets)) || Number(tickets) < 0) {
        return 'Number of tickets must be a positive integer';
    }
    return null;
};

// Controller: createEvent
// Expects JSON body: { name: string, date: string (YYYY-MM-DD), tickets: number }
const createEvent = async (req, res) => {
    const eventData = {
        name: req.body.name?.trim(),
        date: req.body.date,
        tickets: parseInt(req.body.tickets)
    };

    // Validate event data
    const validationErrors = validateEventData(eventData);
    if (validationErrors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: validationErrors
        });
    }

    try {
        // Format data before saving
        eventData.name = eventData.name.charAt(0).toUpperCase() + eventData.name.slice(1);
        const newEvent = await addEvent(eventData);
        
        res.status(201).json({
            message: 'Event created successfully',
            event: newEvent
        });
    } catch (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ error: 'Failed to create event in database' });
    }
};

// Controller: getEvents
// GET /events - retrieve all events
const getEvents = async (req, res) => {
    try {
        const events = await getAllEvents();
        res.json({
            count: events.length,
            events: events
        });
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ error: 'Failed to fetch events from database' });
    }
};

// Controller: getEvent
// GET /events/:id - retrieve a specific event
const getEvent = async (req, res) => {
    // Validate ID
    const idError = validateId(req.params.id);
    if (idError) {
        return res.status(400).json({ error: idError });
    }

    try {
        const event = await getEventById(req.params.id);
        res.json(event);
    } catch (err) {
        console.error('Error fetching event:', err);
        if (err.message === 'Event not found') {
            res.status(404).json({ error: 'Event not found' });
        } else {
            res.status(500).json({ error: 'Failed to fetch event from database' });
        }
    }
};

// Controller: updateTickets
// PATCH /events/:id/tickets - update ticket count for an event
const updateTickets = async (req, res) => {
    // Validate ID
    const idError = validateId(req.params.id);
    if (idError) {
        return res.status(400).json({ error: idError });
    }

    // Validate tickets
    const ticketsError = validateTickets(req.body.tickets);
    if (ticketsError) {
        return res.status(400).json({ error: ticketsError });
    }

    try {
        const updatedEvent = await updateEventTickets(req.params.id, req.body.tickets);
        res.json({
            message: 'Tickets updated successfully',
            event: updatedEvent
        });
    } catch (err) {
        console.error('Error updating tickets:', err);
        if (err.message === 'Event not found') {
            res.status(404).json({ error: 'Event not found' });
        } else {
            res.status(500).json({ error: 'Failed to update tickets in database' });
        }
    }
};

module.exports = {
    createEvent,
    getEvents,
    getEvent,
    updateTickets
};
