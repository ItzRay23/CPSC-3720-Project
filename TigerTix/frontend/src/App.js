
import React, { useState } from 'react';
import './App.css';
import "./a11y.css";
import EventList from "./components/EventList";
import ChatAssistant from "./components/ChatAssistant";

/**
 * @component App
 * @description Main application component with LLM booking assistant.
 * @returns {JSX.Element}
 */
function App() {
	const [activeView, setActiveView] = useState('events');

	return (
		<div className="App">
			<header className="app-header">
				<h1>🎫 Tiger Tix</h1>
				<nav className="app-nav">
					<button 
						className={`nav-btn ${activeView === 'events' ? 'active' : ''}`}
						onClick={() => setActiveView('events')}
					>
						📅 Events
					</button>
					<button 
						className={`nav-btn ${activeView === 'chat' ? 'active' : ''}`}
						onClick={() => setActiveView('chat')}
					>
						🤖 Book with AI
					</button>
				</nav>
			</header>

			<main className="app-main">
				{activeView === 'events' && (
					<div className="view-container">
						<h2>Available Events</h2>
						<EventList />
					</div>
				)}
				
				{activeView === 'chat' && (
					<div className="view-container">
						<ChatAssistant />
					</div>
				)}
			</main>
		</div>
	);
}

export default App;