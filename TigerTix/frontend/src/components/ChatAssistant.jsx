/**
 * @component ChatAssistant
 * @description LLM-powered booking assistant chat interface
 * @returns {JSX.Element}
 */

import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, confirmBooking } from '../api';
import './ChatAssistant.css';

const ChatAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      text: "Hello! Welcome to TigerTix. I'm your booking assistant. I can help you:\n• View available events\n• Book tickets for events\n\nJust tell me what you'd like to do!",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  /**
   * @function handleSendMessage
   * @description Sends user message to LLM and processes response
   * @returns {Promise<void>}
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(userMessage.text);
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        text: response.response.message,
        timestamp: new Date(),
        actions: response.response.actions,
        requiresConfirmation: response.response.requiresConfirmation,
        bookingData: response.response.bookingData
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Set pending booking if confirmation is required
      if (response.response.requiresConfirmation && response.response.bookingData) {
        setPendingBooking(response.response.bookingData);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        text: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * @function handleConfirmBooking
   * @description Confirms the pending booking
   * @returns {Promise<void>}
   */
  const handleConfirmBooking = async () => {
    if (!pendingBooking) return;

    setIsLoading(true);

    try {
      const response = await confirmBooking({
        eventId: pendingBooking.eventId,
        tickets: pendingBooking.tickets
      });

      const confirmationMessage = {
        id: Date.now(),
        type: 'assistant',
        text: response.message + "\n\nIs there anything else I can help you with?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, confirmationMessage]);
      setPendingBooking(null);

    } catch (error) {
      console.error('Booking confirmation error:', error);
      const errorMessage = {
        id: Date.now(),
        type: 'assistant',
        text: `Sorry, there was an error confirming your booking: ${error.message}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * @function handleCancelBooking
   * @description Cancels the pending booking
   * @returns {void}
   */
  const handleCancelBooking = () => {
    setPendingBooking(null);
    const cancelMessage = {
      id: Date.now(),
      type: 'assistant',
      text: "Booking cancelled. Is there anything else I can help you with?",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMessage]);
  };

  /**
   * @function handleQuickAction
   * @description Handles quick action buttons
   * @param {string} action - Action to perform
   * @returns {void}
   */
  const handleQuickAction = (action) => {
    if (action === 'show_events') {
      setInputValue('show available events');
      handleSendMessage();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-assistant">
      <div className="chat-header">
        <h3>🤖 TigerTix Booking Assistant</h3>
        <p>Ask me to show events or book tickets using natural language!</p>
      </div>
      
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              <div className="message-text">
                {message.text.split('\n').map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
            
            {/* Quick action buttons */}
            {message.actions && message.actions.length > 0 && (
              <div className="quick-actions">
                {message.actions.map((action, index) => (
                  <button
                    key={index}
                    className="quick-action-btn"
                    onClick={() => handleQuickAction(action)}
                  >
                    {action === 'show_events' ? 'Show Events' : action}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* Booking confirmation buttons */}
        {pendingBooking && (
          <div className="message assistant">
            <div className="booking-confirmation">
              <div className="confirmation-buttons">
                <button
                  className="confirm-btn"
                  onClick={handleConfirmBooking}
                  disabled={isLoading}
                >
                  ✅ Confirm Booking
                </button>
                <button
                  className="cancel-btn"
                  onClick={handleCancelBooking}
                  disabled={isLoading}
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {isLoading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input">
        <div className="input-container">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (e.g., 'Book 2 tickets for Jazz Night' or 'Show me available events')"
            disabled={isLoading}
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="send-btn"
          >
            Send
          </button>
        </div>
        
        <div className="chat-examples">
          <small>Try: "Show events", "Book 2 tickets for Jazz Night", "What events are available?"</small>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;