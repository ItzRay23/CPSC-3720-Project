import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";


import "./a11y.css"; // global a11y styles
import EventList from "./components/EventList";


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


const eventsRootEl = document.getElementById("events-root");
if (eventsRootEl) {
  const eventsRoot = ReactDOM.createRoot(eventsRootEl);
  eventsRoot.render(
    <React.StrictMode>
      <main id="main" tabIndex={-1}>
        <EventList />
      </main>
    </React.StrictMode>
  );
}

reportWebVitals();
