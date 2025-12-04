

// src/api.js
// Service endpoints configuration
// Production: Use REACT_APP_BACKEND_URL which should point to Render backend
// Development: Set REACT_APP_BACKEND_URL=http://localhost:8000 in .env.local

const BACKEND_BASE = process.env.REACT_APP_BACKEND_URL?.trim?.();

if (!BACKEND_BASE) {
  console.error('❌ REACT_APP_BACKEND_URL is not set!');
  console.error('Set it to: https://cpsc-3720-project.onrender.com for production');
  console.error('Or: http://localhost:8000 for local development');
  throw new Error('REACT_APP_BACKEND_URL environment variable is required');
}

// All API calls go through the gateway with proper routing
const API_BASE = `${BACKEND_BASE}/api`;

console.log('🔧 API Configuration:');
console.log(`  Backend Gateway: ${BACKEND_BASE}`);
console.log(`  API Base: ${API_BASE}`);

/**
 * @function fetchEvents
 * @description Fetches all events from the client service via gateway.
 * Route: /api/client/api/events → gateway removes /client → client service gets /api/events
 * @returns {Promise<Array>} - Resolves with an array of events
 */
export async function fetchEvents() {
  const res = await fetch(`${API_BASE}/client/api/events`, {
    headers: { Accept: "application/json" },
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : data?.events ?? [];
}

/**
 * @function purchaseEvent
 * @description Purchases a ticket for a specific event via client service.
 * Route: /api/client/api/events/:id/purchase → gateway removes /client → client service gets /api/events/:id/purchase
 * @param {number} id - Event ID
 * @returns {Promise<Object>} - Resolves with the updated event
 */
export async function purchaseEvent(id) {
  const res = await fetch(`${API_BASE}/client/api/events/${id}/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: 'include'
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Purchase failed (${res.status})`);
  }
  return await res.json();
}

/**
 * @function sendChatMessage
 * @description Sends a chat message to the LLM booking assistant.
 * Route: /api/llm/parse → gateway keeps full path → LLM service gets /api/llm/parse
 * @param {string} message - User's message
 * @returns {Promise<Object>} - Resolves with parsed intent and response
 */
export async function sendChatMessage(message) {
  const res = await fetch(`${API_BASE}/llm/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: 'include',
    body: JSON.stringify({ message })
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Chat request failed (${res.status})`);
  }
  
  return await res.json();
}

/**
 * @function confirmBooking
 * @description Confirms a booking with the LLM service (which handles the booking through client service).
 * Route: /api/llm/confirm-booking → gateway keeps full path → LLM service gets /api/llm/confirm-booking
 * @param {Object} bookingData - Booking details {eventId, tickets}
 * @returns {Promise<Object>} - Resolves with booking confirmation
 */
export async function confirmBooking(bookingData) {
  const res = await fetch(`${API_BASE}/llm/confirm-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: 'include',
    body: JSON.stringify(bookingData)
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Booking confirmation failed (${res.status})`);
  }
  
  return await res.json();
}
