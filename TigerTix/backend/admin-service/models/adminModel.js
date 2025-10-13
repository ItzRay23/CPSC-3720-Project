const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the shared database
const dbPath = path.join(__dirname, '../../shared-db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Pure database operations below - no business logic

// Insert event into database
const addEvent = (eventData) => {
    return new Promise((resolve, reject) => {
        const { name, date, tickets } = eventData;
        const stmt = db.prepare('INSERT INTO events (name, date, tickets) VALUES (?, ?, ?)');
        
        stmt.run([name, date, tickets], function(err) {
            if (err) {
                reject(new Error('Database error: ' + err.message));
                return;
            }
            
            // Return the newly created event
            db.get('SELECT * FROM events WHERE id = ?', [this.lastID], (err, row) => {
                if (err) {
                    reject(new Error('Database error: ' + err.message));
                    return;
                }
                resolve(row);
            });
        });
        
        stmt.finalize();
    });
};

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

// Remove event by ID
const removeEvent = (id) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM events WHERE id = ?', [id], function(err) {
            if (err) {
                reject(new Error('Database error: ' + err.message));
                return;
            }
            if (this.changes === 0) {
                reject(new Error('Event not found'));
                return;
            }
            resolve({ message: 'Event removed', id });
        });
    });
};

module.exports = {
    addEvent,
    getAllEvents,
    getEventById,
    updateEventTickets,
    removeEvent
};
