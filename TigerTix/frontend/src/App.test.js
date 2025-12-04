import { render, screen } from '@testing-library/react';
import App from './App';

test('renders TigerTix app header', () => {
  render(<App />);
  const headerElement = screen.getByText(/tiger tix/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders login/register button', () => {
  render(<App />);
  const loginButton = screen.getByText(/login.*register/i);
  expect(loginButton).toBeInTheDocument();
});
