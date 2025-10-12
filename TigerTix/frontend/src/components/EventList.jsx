// src/components/EventList.jsx
import { useEffect, useRef, useState } from "react";
import { fetchEvents, purchaseEvent } from "../api";

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const statusRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchEvents();
        setEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message || "Failed to load events");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleBuy(id) {
    setErr("");
    try {
      const updated = await purchaseEvent(id);
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === id
            ? {
                ...ev,
                ...(updated && typeof updated === "object" ? updated : {}),
                tickets:
                  updated?.tickets !== undefined ? updated.tickets : ev.tickets - 1,
              }
            : ev
        )
      );
      setStatusMsg("Ticket purchased successfully.");
      statusRef.current?.focus();
    } catch (e) {
      setErr(e.message || "Purchase failed");
    }
  }

  if (loading) return <p>Loading events…</p>;
  if (err) return <p role="alert">Error: {err}</p>;

  return (
    <>
      {/* Live region for screen readers */}
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusMsg}
      </div>

      <h2 id="events-heading" style={{marginTop: '2rem', fontSize: '2rem', color: '#333'}}>Upcoming Events</h2>
      <div className="event-list" aria-labelledby="events-heading">
        {events.map((ev) => (
          <div key={ev.id} className="event-card">
            <article aria-labelledby={`event-${ev.id}-title`}>
              <h3 id={`event-${ev.id}-title`}>{ev.name}</h3>

              <p>
                <strong>Date: </strong>
                <time dateTime={new Date(ev.date).toISOString()}>
                  {new Date(ev.date).toLocaleString()}
                </time>
              </p>

              <p>
                <strong>Tickets available: </strong>
                <span aria-live="polite">{ev.tickets}</span>
              </p>

              <button
                type="button"
                onClick={() => handleBuy(ev.id)}
                disabled={ev.tickets <= 0}
                aria-label={
                  ev.tickets > 0
                    ? `Buy ticket for ${ev.name} on ${new Date(ev.date).toLocaleString()}`
                    : `Sold out: ${ev.name}`
                }
              >
                {ev.tickets > 0 ? "Buy Ticket" : "Sold Out"}
              </button>
            </article>
          </div>
        ))}
      </div>
    </>
  );
}
