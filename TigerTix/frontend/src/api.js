

// src/api.js
// Service endpoints configuration
const CLIENT_SERVICE_BASE = process.env.REACT_APP_CLIENT_API_BASE?.trim?.() || "http://localhost:6001";
const LLM_SERVICE_BASE = process.env.REACT_APP_LLM_API_BASE?.trim?.() || "http://localhost:5003";

  /**
 * @function fetchEvents
 * @description Fetches all events directly from the client service.
 * @returns {Promise<Array>} - Resolves with an array of events
 */
export async function fetchEvents() {
  console.log(`📡 Frontend: Fetching events from client service: ${CLIENT_SERVICE_BASE}/api/events`);
  const res = await fetch(`${CLIENT_SERVICE_BASE}/api/events`, {
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
  console.log(`📡 Frontend: Purchasing ticket for event ${id} from client service`);
  const res = await fetch(`${CLIENT_SERVICE_BASE}/api/events/${id}/purchase`, {
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
  console.log(`📡 Frontend: Sending chat message to LLM service: "${message}"`);
  const res = await fetch(`${LLM_SERVICE_BASE}/api/llm/parse`, {
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
  console.log(`📡 Frontend: Confirming booking through LLM service:`, bookingData);
  const res = await fetch(`${LLM_SERVICE_BASE}/api/llm/confirm-booking`, {
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
