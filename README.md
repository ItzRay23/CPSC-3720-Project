Architecture & Technologies:

TigerTix is a microservice-based event ticketing system (React + Node.js/Express + SQLite + Auth microservice) with a React frontend. It supports browsing events, logging in securely with JWT cookies, and purchasing tickets with AI-based confirmation (an LLM microservice with text or voice interface, STT/TTS).
The system was implemented progressively over several sprints, with the end result being fully deployed with automated CI/CD.


Technologies used:

⦁	Frontend: React + Vercel
⦁	Backend: Node.js, Express + Render/Railway
⦁	Database: SQLite
⦁	Auth Microservice: JWT, hashed passwords, HTTP-only cookies
⦁	LLM Microservice: Booking-intent parser + proposal confirmation
⦁	Testing: Jest, Supertest, React Testing Library
⦁	CI/CD: GitHub Actions (install → test → build → deploy)


Services:

Frontend Service:
⦁	Renders the UI, and is responsible for browsing events, logging in, and confirming purchases.
⦁	Handles VoiceChat (using browser STT/TTS).
⦁	Talks to the client/admin services and the LLM.


Client Service (6001):
⦁	GET /api/events
⦁	POST /api/events/:id/purchase (JWT-protected)
⦁	Proxy for LLM service (as with Admin)


Auth Service (4000):
⦁	POST /auth/register, /auth/login, /auth/logout
⦁	Issues secure HTTP-only JWT cookies
⦁	JWT middleware protects purchase/admin routes


Admin Service (5001):
⦁	CRUD for events
⦁	Transactional purchasing, with concurrency protection (rollback if conflicts)


LLM Service (5003):
⦁	/api/llm/parse — parses natural language booking requests
⦁	/api/llm/confirm-booking — generates final confirmation text
⦁	Returns structured proposal (event, count, intent)


Database:
⦁	SQLite, accessed via Admin service
⦁	Foreign keys, rollback, etc. for transactional integrity


Installation & Local Setup:

Clone the repo:

git clone https://github.com/ItzRay23/CPSC-3720-Project

cd CPSC-3720-Project


Backend Setup:

cd backend

npm install

npm start


Frontend Setup:

cd frontend

npm install

npm start


Environment Variables:

Backend (.env):

PORT=3001
JWT_SECRET=<your-secret>
LLM_API_KEY=<your-openai-key>
DB_FILE=./tigertix.db
CLIENT_URL=http://localhost:3000


Frontend (.env):

REACT_APP_API_URL=https://<your-backend-url>
REACT_APP_AUTH_URL=https://<your-auth-service>
REACT_APP_LLM_URL=https://<your-llm-service>


Regression Tests

Backend Tests (Jest + Supertest):

cd backend
npm test

Includes:

⦁	Register/login tests
⦁	JWT auth middleware
⦁	Protected routes
⦁	Event creation + purchasing
⦁	Concurrency checks (multiple buyers on last ticket) — see page 3 of Sprint 3 report


Frontend Tests:

cd frontend
npm test

Includes:
⦁	Form validation
⦁	Error handling (401 redirect)
⦁	Purchase flow
⦁	LLM confirmation UI


Team Members & Roles:

Omar Masri — Frontend integration support, UI updates, testing, documentation, deployment support, table of contents + metrics in + reports and diagrams

Rayan Ahmed — Backend architecture, frontend integration, admin routes, DB, JWT middleware, testing, deployment, UI updates