

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

const CLIENT_SERVICE_BASE = `${BACKEND_BASE}/api/client`;
const LLM_SERVICE_BASE = `${BACKEND_BASE}/api/llm`;

console.log('🔧 API Configuration:');
console.log(`  Backend: ${BACKEND_BASE}`);
console.log(`  Client Service: ${CLIENT_SERVICE_BASE}`);
console.log(`  LLM Service: ${LLM_SERVICE_BASE}`);

  /**
 * @function fetchEvents
 * @description Fetches all events directly from the client service.
 * @returns {Promise<Array>} - Resolves with an array of events
 */
export async function fetchEvents() {
  console.log(`📡 Fetching events from: ${CLIENT_SERVICE_BASE}/events`);
  const res = await fetch(`${CLIENT_SERVICE_BASE}/events`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`);
  const data = await res.json();
  console.log(`✅ Frontend: Received ${Array.isArray(data) ? data.length : 0} events from client service`);
  // Your backend returns the array directly; fall back if someone later wraps it.
  return Array.isArray(data) ? data : data?.events ?? [];
}

/**
 * @function purchaseEvent
 * @description Purchases a ticket for a specific event directly from client service.
 * @param {number} id - Event ID
 * @returns {Promise<Object>} - Resolves with the updated event
 */
export async function purchaseEvent(id) {
  console.log(`📡 Purchasing ticket for event ${id}`);
  const res = await fetch(`${CLIENT_SERVICE_BASE}/events/${id}/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Purchase failed (${res.status})`);
  }
  const result = await res.json();
  console.log(`✅ Frontend: Successfully purchased ticket for event ${id}`);
  return result;
}

/**
 * @function sendChatMessage
 * @description Sends a chat message to the LLM booking assistant
 * @param {string} message - User's message
 * @returns {Promise<Object>} - Resolves with parsed intent and response
 */
export async function sendChatMessage(message) {
  console.log(`📡 Sending chat message: "${message}"`);
  const res = await fetch(`${LLM_SERVICE_BASE}/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ message })
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error(`❌ Frontend: Chat request failed (${res.status}):`, errorData.error);
    throw new Error(errorData.error || `Chat request failed (${res.status})`);
  }
  
  const result = await res.json();
  console.log(`✅ Frontend: Received LLM response with intent: ${result.parsed?.intent}`);
  return result;
}

/**
 * @function confirmBooking
 * @description Confirms a booking with the LLM service (which handles the booking through client service)
 * @param {Object} bookingData - Booking details {eventId, tickets}
 * @returns {Promise<Object>} - Resolves with booking confirmation
 */
export async function confirmBooking(bookingData) {
  console.log(`📡 Confirming booking:`, bookingData);
  const res = await fetch(`${LLM_SERVICE_BASE}/confirm-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(bookingData)
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error(`❌ Frontend: Booking confirmation failed (${res.status}):`, errorData.error);
    throw new Error(errorData.error || `Booking confirmation failed (${res.status})`);
  }
  
  const result = await res.json();
  console.log(`✅ Frontend: Booking confirmed successfully:`, result.booking);
  return result;
}
