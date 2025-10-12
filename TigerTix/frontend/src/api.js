// src/api.js
// If you set a CRA proxy (below), keep API_BASE as "" (same-origin).
// Otherwise, point it at your client-service port (e.g., 6001).

const API_BASE =
  process.env.REACT_APP_CLIENT_API_BASE?.trim?.() || ""; // use proxy/same-origin

export async function fetchEvents() {
  const res = await fetch(`${API_BASE}/api/events`);
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`);
  return res.json();
}

export async function purchaseEvent(id) {
  const res = await fetch(`${API_BASE}/api/events/${id}/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Purchase failed (${res.status})`);
  }
  return res.json();
}
