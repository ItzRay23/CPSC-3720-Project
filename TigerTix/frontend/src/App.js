
import React from 'react';
import './App.css';
import "./a11y.css";
import EventList from "./components/EventList";

/**
 * @component App
 * @description Main application component.
 * @returns {JSX.Element}
 */
function App() {
	return (
		<div className="App">
			<h1>Tiger Tix</h1>
			<EventList />
		</div>
	);
}

export default App;