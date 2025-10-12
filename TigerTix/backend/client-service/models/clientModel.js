const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the shared database
const dbPath = path.join(__dirname, '../../shared-db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Retrieve all events from database
const getAllEvents = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM events ORDER BY date', [], (err, rows) => {
            if (err) {
                reject(new Error('Database error: ' + err.message));
                return;
            }
            resolve(rows);
        });
    });
};

// Retrieve single event by ID
const getEventById = (id) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM events WHERE id = ?', [id], (err, row) => {
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
    });
};

// Update event tickets
const updateEventTickets = (id, tickets) => {
    return new Promise((resolve, reject) => {
        db.run('UPDATE events SET tickets = ? WHERE id = ?', [tickets, id], function(err) {
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
    });
};

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
