// backend/client-service/server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" })); // allow CRA dev
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));

// Events (what the React "Events" page calls)
app.get("/api/events", (_req, res) => {
  res.json([
    { id: 1, title: "Jazz Night", date: "2025-11-08", seats: 12 },
    { id: 2, title: "Open Mic",  date: "2025-11-12", seats: 5  }
  ]);
});

app.post("/api/events/:id/purchase", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Bad id" });
  res.json({ ok: true, id });
});

// ✅ LLM parse endpoint (Task 2: no auto-booking)
app.post("/api/llm/parse", (req, res) => {
  const text = (req.body?.message || "").toLowerCase();
  const replyText = text.includes("jazz")
    ? "I found 'Jazz Night' with 12 tickets. Do you want me to prepare 2 tickets?"
    : "I can browse events and prepare a booking. Try saying: Book two tickets for Jazz Night.";
  res.json({ replyText, parsed: { intent: "query_or_prepare" } });
});

// 404 AFTER all routes
app.use((req, res) => {
  res.status(404).json({ error: `No route ${req.method} ${req.originalUrl}` });
});

// Error handler LAST
app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error", detail: String(err) });
});

const PORT = process.env.PORT || 6001;
app.listen(PORT, () => console.log(`CLIENT service listening http://localhost:${PORT}`));
