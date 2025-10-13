const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the shared database
const dbPath = path.join(__dirname, '../../shared-db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Retrieve all events from database
/**
 * @function getAllEvents
 * @description Retrieves all events from the database.
 * @returns {Promise<Array>} - Resolves with an array of events
 */
const getAllEvents = () => db.all('SELECT * FROM events ORDER BY date', [], (err, rows) => {
    if (err) {
        reject(new Error('Database error: ' + err.message));
        return;
    }
    resolve(rows);
});

// Retrieve single event by ID
/**
 * @function getEventById
 * @description Retrieves a single event by ID.
 * @param {number} id - Event ID
 * @returns {Promise<Object>} - Resolves with the event object
 */
const getEventById = (id) => db.get('SELECT * FROM events WHERE id = ?', [id], (err, row) => {
    if (err) {
        reject(new Error('Database error: ' + err.message));
        return;
    }
    if (!row) {
        reject(new Error('Event not found'));
        return;
    }
    resolve(row);
});

// Update event tickets
/**
 * @function updateEventTickets
 * @description Updates the ticket count for an event.
 * @param {number} id - Event ID
 * @param {number} tickets - New ticket count
 * @returns {Promise<Object>} - Resolves with the updated event
 */
const updateEventTickets = (id, tickets) => db.run('UPDATE events SET tickets = ? WHERE id = ?', [tickets, id], function(err) {
    if (err) {
        reject(new Error('Database error: ' + err.message));
        return;
    }
    if (this.changes === 0) {
        reject(new Error('Event not found'));
        return;
    }
    getEventById(id).then(resolve).catch(reject);
});

// Ensure database connection is closed when the process exits
process.on('exit', () => {
    db.close();
});

module.exports = {
    getAllEvents,
    getEventById,
    updateEventTickets
};

module.exports = { getAllEvents, getEventById, updateEventTickets };
