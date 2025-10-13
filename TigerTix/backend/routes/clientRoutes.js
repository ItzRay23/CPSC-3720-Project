const express = require("express");
const router = express.Router();

// In-memory demo data
let events = [
  { id: 1, name: "Homecoming Bash", date: new Date(Date.now()+86400000).toISOString(), tickets: 42 },
  { id: 2, name: "Library Study Night", date: new Date(Date.now()+172800000).toISOString(), tickets: 10 },
  { id: 3, name: "Basketball vs. Duke", date: new Date(Date.now()+259200000).toISOString(), tickets: 0 },
];

router.get("/events", (_req, res) => res.json(events));

router.post("/events/:id/purchase", (req, res) => {
  const id = Number(req.params.id);
  const ev = events.find(e => e.id === id);
  if (!ev) return res.status(404).json({ error: "Event not found" });
  if (ev.tickets <= 0) return res.status(400).json({ error: "Sold out" });
  ev.tickets -= 1;
  res.json(ev);
});

module.exports = router;
