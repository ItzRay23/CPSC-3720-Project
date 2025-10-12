Admin Service

This microservice provides an endpoint for admins to create events and stores them in a shared SQLite database at `backend/data/events.db`.

Run:

1. cd into `backend/admin-service`
2. npm install
3. npm start (server listens on 5001)

Test (from PowerShell):

curl -Method POST -Uri http://localhost:5001/api/admin/events -ContentType 'application/json' -Body '{"name":"Test Event","date":"2025-12-01","tickets":100}'

The DB file will be created at `backend/data/events.db`.
