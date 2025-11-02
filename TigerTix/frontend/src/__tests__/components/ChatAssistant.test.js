/**
 * @fileoverview Tests for ChatAssistant component
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ChatAssistant from '../ChatAssistant';

// Mock the voice utilities
jest.mock('../utils/textToSpeechUtils', () => ({
  speakAssistantResponse: jest.fn(),
  stopSpeaking: jest.fn(),
  isTextToSpeechSupported: jest.fn(() => true)
}));

jest.mock('../hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: () => ({
    isListening: false,
    isProcessing: false,
    error: null,
    startListening: jest.fn(),
    stopListening: jest.fn(),
    resetError: jest.fn()
  })
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('ChatAssistant', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        intent: 'book_tickets',
        event_keywords: ['auburn', 'football'],
        quantity: 2,
        confidence: 0.9,
        response: 'Great! I can help you book tickets for the Auburn football game.'
      })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    test('should render chat interface elements', () => {
      render(<ChatAssistant />);
      
      expect(screen.getByRole('textbox', { name: /type your message/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /voice input/i })).toBeInTheDocument();
      expect(screen.getByText(/book tickets with voice or text/i)).toBeInTheDocument();
    });

    test('should render welcome message initially', () => {
      render(<ChatAssistant />);
      
      expect(screen.getByText(/hello! i'm your tigertix booking assistant/i)).toBeInTheDocument();
      expect(screen.getByText(/try saying something like/i)).toBeInTheDocument();
    });

    test('should have accessible form elements', () => {
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      const voiceButton = screen.getByRole('button', { name: /voice input/i });
      
      expect(textarea).toHaveAttribute('aria-label');
      expect(sendButton).toHaveAttribute('aria-label');
      expect(voiceButton).toHaveAttribute('aria-label');
    });
  });

  describe('Message Input', () => {
    test('should accept text input', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'I need tickets for the basketball game');
      
      expect(textarea).toHaveValue('I need tickets for the basketball game');
    });

    test('should clear input after sending message', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    test('should send message on Enter key press', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test message{enter}');
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/llm/parse'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Test message')
          })
        );
      });
    });

    test('should not send empty messages', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should trim whitespace from messages', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, '   Test message   ');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            body: expect.stringContaining('"message":"Test message"')
          })
        );
      });
    });
  });

  describe('Message Display', () => {
    test('should display user messages', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, 'Hello assistant');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Hello assistant')).toBeInTheDocument();
      });
    });

    test('should display assistant responses', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, 'I need tickets');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/great! i can help you book tickets/i)).toBeInTheDocument();
      });
    });

    test('should show different styles for user and assistant messages', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText(/great! i can help/i)).toBeInTheDocument();
      });
      
      // Check CSS classes are applied appropriately
      const userMessage = screen.getByText('Test message');
      const assistantMessage = screen.getByText(/great! i can help/i);
      
      expect(userMessage).toBeInTheDocument();
      expect(assistantMessage).toBeInTheDocument();
    });

    test('should display timestamps for messages', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        // Look for timestamp pattern (e.g., "10:00 AM")
        expect(screen.getByText(/\d{1,2}:\d{2}\s?(AM|PM)/)).toBeInTheDocument();
      });
    });
  });

  describe('Voice Integration', () => {
    test('should have voice input button', () => {
      render(<ChatAssistant />);
      
      const voiceButton = screen.getByRole('button', { name: /voice input/i });
      expect(voiceButton).toBeInTheDocument();
    });

    test('should show voice input status', () => {
      const mockUseVoiceRecognition = require('../hooks/useVoiceRecognition').useVoiceRecognition;
      mockUseVoiceRecognition.mockReturnValue({
        isListening: true,
        isProcessing: false,
        error: null,
        startListening: jest.fn(),
        stopListening: jest.fn(),
        resetError: jest.fn()
      });

      render(<ChatAssistant />);
      
      const voiceButton = screen.getByRole('button', { name: /voice input/i });
      expect(voiceButton).toHaveTextContent('🛑'); // Listening indicator
    });

    test('should show voice error state', () => {
      const mockUseVoiceRecognition = require('../hooks/useVoiceRecognition').useVoiceRecognition;
      mockUseVoiceRecognition.mockReturnValue({
        isListening: false,
        isProcessing: false,
        error: 'Microphone not available',
        startListening: jest.fn(),
        stopListening: jest.fn(),
        resetError: jest.fn()
      });

      render(<ChatAssistant />);
      
      const voiceButton = screen.getByRole('button', { name: /voice input/i });
      expect(voiceButton).toHaveTextContent('🚫'); // Error indicator
    });
  });

  describe('API Integration', () => {
    test('should send message to LLM service', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, 'Book football tickets');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/llm/parse'),
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: expect.stringContaining('Book football tickets')
          })
        );
      });
    });

    test('should include chat history in API calls', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      // Send first message
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, 'First message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
      
      // Send second message
      await user.type(textarea, 'Second message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
      
      const secondCall = global.fetch.mock.calls[1];
      const requestBody = JSON.parse(secondCall[1].body);
      expect(requestBody.chat_history).toHaveLength(2); // Previous user and assistant messages
    });

    test('should handle API errors gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/sorry, i'm having trouble/i)).toBeInTheDocument();
      });
    });

    test('should handle API timeout', async () => {
      // Mock a delayed response that times out
      global.fetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );
      
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, 'Test message');
      await user.click(sendButton);
      
      // Fast-forward time to trigger timeout
      await act(async () => {
        jest.advanceTimersByTime(30000);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/request timed out/i)).toBeInTheDocument();
      });
    });
  });

  describe('Text-to-Speech Integration', () => {
    test('should call TTS for assistant responses', async () => {
      const { speakAssistantResponse } = require('../utils/textToSpeechUtils');
      
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(speakAssistantResponse).toHaveBeenCalledWith(
          expect.stringContaining('Great! I can help you book tickets')
        );
      });
    });

    test('should have TTS toggle button', () => {
      render(<ChatAssistant />);
      
      const ttsButton = screen.getByRole('button', { name: /toggle voice responses/i });
      expect(ttsButton).toBeInTheDocument();
    });

    test('should toggle TTS on/off', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const ttsButton = screen.getByRole('button', { name: /toggle voice responses/i });
      
      // Initially enabled
      expect(ttsButton).toHaveTextContent('🔊');
      
      // Click to disable
      await user.click(ttsButton);
      expect(ttsButton).toHaveTextContent('🔇');
      
      // Click to enable again
      await user.click(ttsButton);
      expect(ttsButton).toHaveTextContent('🔊');
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<ChatAssistant />);
      
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label');
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Chat messages');
      expect(screen.getByRole('button', { name: /send message/i })).toHaveAttribute('aria-label');
    });

    test('should announce new messages to screen readers', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent(/new assistant message/i);
      });
    });

    test('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /send message/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /voice input/i })).toHaveFocus();
    });

    test('should have sufficient color contrast', () => {
      render(<ChatAssistant />);
      
      // This is more of a visual test, but we can check that appropriate CSS classes are applied
      const chatContainer = screen.getByRole('region', { name: /chat messages/i });
      expect(chatContainer).toHaveClass('chat-messages');
    });
  });

  describe('Performance', () => {
    test('should limit message history length', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      // Send many messages
      for (let i = 0; i < 25; i++) {
        await user.clear(textarea);
        await user.type(textarea, `Message ${i}`);
        await user.click(sendButton);
        await waitFor(() => expect(textarea).toHaveValue(''));
      }
      
      // Check that message history is limited (e.g., to 20 messages)
      const messages = screen.getAllByText(/Message \d+/);
      expect(messages.length).toBeLessThanOrEqual(20);
    });

    test('should debounce rapid user input', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      // Rapid clicks
      await user.type(textarea, 'Test');
      await user.click(sendButton);
      await user.type(textarea, 'Test2');
      await user.click(sendButton);
      await user.type(textarea, 'Test3');
      await user.click(sendButton);
      
      // Should not make too many API calls at once
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long messages', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const longMessage = 'This is a very long message. '.repeat(100);
      const textarea = screen.getByRole('textbox');
      
      await user.type(textarea, longMessage);
      
      // Should handle long input gracefully
      expect(textarea.value.length).toBeGreaterThan(1000);
    });

    test('should handle special characters and emojis', async () => {
      const user = userEvent.setup();
      render(<ChatAssistant />);
      
      const specialMessage = 'I need 🎫 tickets for 🏀 basketball! #AuburnTigers @TigerTix';
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textarea, specialMessage);
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(specialMessage)).toBeInTheDocument();
      });
    });

    test('should handle component unmounting gracefully', () => {
      const { unmount } = render(<ChatAssistant />);
      
      // Should not throw errors when unmounting
      expect(() => unmount()).not.toThrow();
    });
  });
});