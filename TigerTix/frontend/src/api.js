

// src/api.js
const API_BASE =
  process.env.REACT_APP_CLIENT_API_BASE?.trim?.() || ""; // use proxy/same-origin

  /**
 * @function fetchEvents
 * @description Fetches all events from the API.
 * @returns {Promise<Array>} - Resolves with an array of events
 */
export async function fetchEvents() {
  const res = await fetch(`${API_BASE}/api/events`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`);
  const data = await res.json();
  // Your backend returns the array directly; fall back if someone later wraps it.
  return Array.isArray(data) ? data : data?.events ?? [];
}

/**
 * @function purchaseEvent
 * @description Purchases a ticket for a specific event.
 * @param {number} id - Event ID
 * @returns {Promise<Object>} - Resolves with the updated event
 */
export async function purchaseEvent(id) {
  const res = await fetch(`${API_BASE}/api/events/${id}/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Purchase failed (${res.status})`);
  }
  return res.json();
}
