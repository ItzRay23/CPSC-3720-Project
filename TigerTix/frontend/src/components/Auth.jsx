import React, { useState } from 'react';
import './Auth.css';

/**
 * @component Auth
 * @description Authentication component with registration and login forms
 * Handles user registration with email, password, confirm password, first name, and last name
 * @returns {JSX.Element}
 */
function Auth({ onLoginSuccess }) {
	const [isLogin, setIsLogin] = useState(true);
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		confirmPassword: '',
		firstName: '',
		lastName: ''
	});
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		});
		setError('');
	};

	const validateForm = () => {
		if (!formData.email || !formData.password) {
			setError('Email and password are required');
			return false;
		}

		if (!isLogin) {
			if (!formData.firstName || !formData.lastName) {
				setError('First name and last name are required');
				return false;
			}

			if (formData.password !== formData.confirmPassword) {
				setError('Passwords do not match');
				return false;
			}

			if (formData.password.length < 6) {
				setError('Password must be at least 6 characters');
				return false;
			}
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formData.email)) {
			setError('Please enter a valid email address');
			return false;
		}

		return true;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		
		if (!validateForm()) {
			return;
		}

		setLoading(true);
		setError('');

		try {
			const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
			const body = isLogin 
				? { email: formData.email, password: formData.password }
				: {
					email: formData.email,
					password: formData.password,
					firstName: formData.firstName,
					lastName: formData.lastName
				};

			// Use backend URL from environment variable or fall back to gateway
			const BACKEND_URL = process.env.REACT_APP_BACKEND_URL?.trim?.() || 'http://localhost:8000';
			const response = await fetch(`${BACKEND_URL}${endpoint}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include', // Include cookies
				body: JSON.stringify(body)
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Authentication failed');
			}

			// Store token in localStorage for React state
			if (data.token) {
				localStorage.setItem('authToken', data.token);
			}

			// Call success callback with user data
			if (onLoginSuccess) {
				onLoginSuccess(data.user);
			}

			// Reset form
			setFormData({
				email: '',
				password: '',
				confirmPassword: '',
				firstName: '',
				lastName: ''
			});

		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const toggleMode = () => {
		setIsLogin(!isLogin);
		setError('');
		setFormData({
			email: '',
			password: '',
			confirmPassword: '',
			firstName: '',
			lastName: ''
		});
	};

	return (
		<div className="auth-container">
			<div className="auth-card">
				<h2>{isLogin ? 'Login' : 'Register'}</h2>
				
				<form onSubmit={handleSubmit} className="auth-form">
					{!isLogin && (
						<>
							<div className="form-group">
								<label htmlFor="firstName">First Name</label>
								<input
									type="text"
									id="firstName"
									name="firstName"
									value={formData.firstName}
									onChange={handleChange}
									placeholder="Enter your first name"
									disabled={loading}
									required={!isLogin}
								/>
							</div>

							<div className="form-group">
								<label htmlFor="lastName">Last Name</label>
								<input
									type="text"
									id="lastName"
									name="lastName"
									value={formData.lastName}
									onChange={handleChange}
									placeholder="Enter your last name"
									disabled={loading}
									required={!isLogin}
								/>
							</div>
						</>
					)}

					<div className="form-group">
						<label htmlFor="email">Email</label>
						<input
							type="email"
							id="email"
							name="email"
							value={formData.email}
							onChange={handleChange}
							placeholder="Enter your email"
							disabled={loading}
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="password">Password</label>
						<input
							type="password"
							id="password"
							name="password"
							value={formData.password}
							onChange={handleChange}
							placeholder="Enter your password"
							disabled={loading}
							required
						/>
					</div>

					{!isLogin && (
						<div className="form-group">
							<label htmlFor="confirmPassword">Confirm Password</label>
							<input
								type="password"
								id="confirmPassword"
								name="confirmPassword"
								value={formData.confirmPassword}
								onChange={handleChange}
								placeholder="Confirm your password"
								disabled={loading}
								required={!isLogin}
							/>
						</div>
					)}

					{error && (
						<div className="error-message" role="alert">
							{error}
						</div>
					)}

					<button 
						type="submit" 
						className="submit-btn"
						disabled={loading}
					>
						{loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
					</button>
				</form>

				<div className="auth-toggle">
					<p>
						{isLogin ? "Don't have an account? " : "Already have an account? "}
						<button 
							type="button"
							onClick={toggleMode}
							className="toggle-btn"
							disabled={loading}
						>
							{isLogin ? 'Register here' : 'Login here'}
						</button>
					</p>
				</div>
			</div>
		</div>
	);
}

export default Auth;
