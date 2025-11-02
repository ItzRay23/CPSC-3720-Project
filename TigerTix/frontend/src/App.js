// frontend/src/App.js
import React, { useState } from "react";
import "./App.css";
import "./a11y.css";

import EventList from "./components/EventList";
import VoiceChat from "./components/VoiceChat";

export default function App() {
  const [activeView, setActiveView] = useState("events"); // 'events' | 'voice'

  return (
    <div className="App">
      <header className="app-header">
        <h1>🎟️ Tiger Tix</h1>

        <nav className="tabbar" aria-label="Primary">
          <button
            type="button"
            onClick={() => setActiveView("events")}
            className={`tab ${activeView === "events" ? "tab--active" : ""}`}
            aria-pressed={activeView === "events"}
          >
            🗓️ Events
          </button>

          <button
            type="button"
            onClick={() => setActiveView("voice")}
            className={`tab ${activeView === "voice" ? "tab--active" : ""}`}
            aria-pressed={activeView === "voice"}
          >
            🤖 Book with AI
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeView === "events" ? <EventList /> : <VoiceChat />}
      </main>
    </div>
  );
}
