const path = require('path');
const db = require(path.join(__dirname, '../../shared-db'));

// Reuse shared-db methods
const getAllEvents = () => db.getAllEvents();
const getEventById = (id) => db.getEventById(id);
const updateEventTickets = (id, tickets) => db.updateEventTickets(id, tickets);

module.exports = { getAllEvents, getEventById, updateEventTickets };
