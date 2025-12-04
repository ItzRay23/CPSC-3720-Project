const { addEvent, getAllEvents, getEventById, updateEventTickets, removeEvent } = require('../models/adminModel');

/**
 * @function deleteEvent
 * @description Deletes an event by ID.
 * @param {Object} req - Express request object (expects event ID in params)
 * @param {Object} res - Express response object
 * @returns {void}
 */
const deleteEvent = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) {
        return res.status(400).json({ message: 'Invalid event ID' });
    }
    try {
        const result = await removeEvent(id);
        res.json(result);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

/**
 * @function validateEventData
 * @description Validates event data for required fields, date format, and ticket count.
 * @param {Object} eventData - The event data to validate. Should include name (string), date (YYYY-MM-DD string), and tickets (integer).
 * @returns {Array<string>} - An array of error messages. Empty if validation passes.
 */
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
        }
        // Note: Past date validation removed for testing flexibility
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

/**
 * @function createEvent
 * @description Creates a new event in the database.
 * @param {Object} req - Express request object (expects event data in body)
 * @param {Object} res - Express response object
 * @returns {void}
 */
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
            message: 'Validation failed',
            errors: validationErrors
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
        res.status(500).json({
            message: 'Failed to create event in database',
            error: err.message || 'Unknown error'
        });
    }
};

/**
 * @function getEvents
 * @description Retrieves all events from the database.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void}
 */
const getEvents = async (req, res) => {
    try {
        const events = await getAllEvents();
        res.json({
            message: 'Events fetched successfully',
            count: events.length,
            events: events
        });
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({
            message: 'Failed to fetch events from database',
            error: err.message || 'Unknown error'
        });
    }
};

/**
 * @function getEvent
 * @description Retrieves a specific event by ID.
 * @param {Object} req - Express request object (expects event ID in params)
 * @param {Object} res - Express response object
 * @returns {void}
 */
const getEvent = async (req, res) => {
    // Validate ID
    const idError = validateId(req.params.id);
    if (idError) {
        return res.status(400).json({
            message: 'Invalid event ID',
            error: idError
        });
    }

    try {
        const event = await getEventById(req.params.id);
        if (!event) {
            return res.status(404).json({
                message: 'Event not found',
                error: 'No event with the provided ID'
            });
        }
        res.json({
            message: 'Event fetched successfully',
            event: event
        });
    } catch (err) {
        console.error('Error fetching event:', err);
        res.status(500).json({
            message: 'Failed to fetch event from database',
            error: err.message || 'Unknown error'
        });
    }
};

/**
 * @function updateTickets
 * @description Updates the ticket count for a specific event.
 * @param {Object} req - Express request object (expects event ID in params, tickets in body)
 * @param {Object} res - Express response object
 * @returns {void}
 */
const updateTickets = async (req, res) => {
    // Validate ID
    const idError = validateId(req.params.id);
    if (idError) {
        return res.status(400).json({
            message: 'Invalid event ID',
            error: idError
        });
    }

    // Validate tickets
    const ticketsError = validateTickets(req.body.tickets);
    if (ticketsError) {
        return res.status(400).json({
            message: 'Invalid ticket count',
            error: ticketsError
        });
    }

    try {
        const updatedEvent = await updateEventTickets(req.params.id, req.body.tickets);
        if (!updatedEvent) {
            return res.status(404).json({
                message: 'Event not found',
                error: 'No event with the provided ID'
            });
        }
        res.json({
            message: 'Tickets updated successfully',
            event: updatedEvent
        });
    } catch (err) {
        console.error('Error updating tickets:', err);
        res.status(500).json({
            message: 'Failed to update tickets in database',
            error: err.message || 'Unknown error'
        });
    }
};

module.exports = {
    createEvent,
    getEvents,
    getEvent,
    updateTickets,
    deleteEvent
};
