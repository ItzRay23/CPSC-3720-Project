
import React, { useState, useEffect } from 'react';
import './App.css';
import "./a11y.css";
import EventList from "./components/EventList";
import ChatAssistant from "./components/ChatAssistant";
import Auth from "./components/Auth";

/**
 * @component App
 * @description Main application component with authentication and LLM booking assistant.
 * @returns {JSX.Element}
 */
function App() {
	const [activeView, setActiveView] = useState('events');
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	// Check if user is logged in on mount
	useEffect(() => {
		const checkAuth = async () => {
			const token = localStorage.getItem('authToken');
			if (token) {
				try {
					const response = await fetch('http://localhost:5004/api/auth/verify', {
						headers: {
							'Authorization': `Bearer ${token}`
						},
						credentials: 'include'
					});

					if (response.ok) {
						const data = await response.json();
						setUser(data.user);
					} else {
						// Token invalid or expired
						localStorage.removeItem('authToken');
					}
				} catch (error) {
					console.error('Auth check failed:', error);
					localStorage.removeItem('authToken');
				}
			}
			setLoading(false);
		};

		checkAuth();
	}, []);

	const handleLoginSuccess = (userData) => {
		setUser(userData);
		setActiveView('events');
	};

	const handleLogout = async () => {
		try {
			await fetch('http://localhost:5004/api/auth/logout', {
				method: 'POST',
				credentials: 'include'
			});
		} catch (error) {
			console.error('Logout failed:', error);
		}

		localStorage.removeItem('authToken');
		setUser(null);
		setActiveView('login');
	};

	if (loading) {
		return (
			<div className="App">
				<div className="loading">Loading...</div>
			</div>
		);
	}

	return (
		<div className="App">
			<header className="app-header">
				<h1>🎫 Tiger Tix</h1>
				
				{user && (
					<div className="user-info">
						<span>Logged in as {user.email}</span>
						<button onClick={handleLogout} className="logout-btn">
							Logout
						</button>
					</div>
				)}

				<nav className="app-nav">
					{!user ? (
						<button 
							className={`nav-btn ${activeView === 'login' ? 'active' : ''}`}
							onClick={() => setActiveView('login')}
						>
							🔐 Login / Register
						</button>
					) : (
						<>
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
						</>
					)}
				</nav>
			</header>

			<main className="app-main">
				{activeView === 'login' && (
					<div className="view-container">
						<Auth onLoginSuccess={handleLoginSuccess} />
					</div>
				)}

				{activeView === 'events' && user && (
					<div className="view-container">
						<h2>Available Events</h2>
						<EventList />
					</div>
				)}
				
				{activeView === 'chat' && user && (
					<div className="view-container">
						<ChatAssistant />
					</div>
				)}

				{!user && activeView !== 'login' && (
					<div className="view-container">
						<h2>Please log in to access this feature</h2>
						<button 
							onClick={() => setActiveView('login')}
							className="login-prompt-btn"
						>
							Go to Login
						</button>
					</div>
				)}
			</main>
		</div>
	);
}

export default App;