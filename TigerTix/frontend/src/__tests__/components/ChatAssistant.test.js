/**
 * @fileoverview Tests for ChatAssistant component using mock-based testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatAssistant from '../../components/ChatAssistant';

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock the voice utilities
jest.mock('../../utils/textToSpeechUtils', () => ({
  speakAssistantResponse: jest.fn(),
  stopSpeaking: jest.fn(),
  isTextToSpeechSupported: jest.fn(() => true)
}));

// Mock useVoiceRecognition hook
const mockStartListening = jest.fn();
const mockStopListening = jest.fn();
const mockResetError = jest.fn();

jest.mock('../../hooks/useVoiceRecognition', () => ({
  useVoiceRecognition: jest.fn(() => ({
    isSupported: true,
    isListening: false,
    isProcessing: false,
    hasPermission: true,
    error: null,
    transcript: '',
    interimTranscript: '',
    startListening: mockStartListening,
    stopListening: mockStopListening,
    resetError: mockResetError,
    resetTranscript: jest.fn()
  }))
}));

// Mock the EnhancedVoiceInput component to avoid deep rendering issues
jest.mock('../../components/VoiceInput/EnhancedVoiceInput', () => {
  return function MockEnhancedVoiceInput({ onTranscriptChange }) {
    return (
      <button 
        onClick={() => mockStartListening(onTranscriptChange)}
        aria-label="voice input"
      >
        🎤
      </button>
    );
  };
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('ChatAssistant', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockStartListening.mockClear();
    mockStopListening.mockClear();
    mockResetError.mockClear();
    
    // Mock successful API responses
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        parsed: {
          intent: 'book_tickets',
          event: 'Auburn Football',
          eventId: 1,
          quantity: 2,
          confidence: 'high'
        },
        response: {
          message: 'Great! I can help you book tickets for the Auburn football game.',
          suggestions: ['Book tickets', 'View events'],
          requiresConfirmation: false
        }
      })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    test('should render chat interface with textarea', () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    test('should render multiple buttons', () => {
      render(<ChatAssistant />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('should render with welcome message', () => {
      render(<ChatAssistant />);
      expect(screen.getByText(/tigertix booking assistant/i)).toBeInTheDocument();
    });

    test('should render textarea with aria-label', () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label');
    });
  });

  describe('Message Input', () => {
    test('should accept text input', () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      expect(textarea.value).toBe('Test message');
    });

    test('should handle long input text', () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      const longMessage = 'Test message. '.repeat(50);
      
      fireEvent.change(textarea, { target: { value: longMessage } });
      expect(textarea.value).toBe(longMessage);
    });

    test('should handle special characters', () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      const specialMessage = 'I need 🎫 tickets! #Auburn @TigerTix';
      
      fireEvent.change(textarea, { target: { value: specialMessage } });
      expect(textarea.value).toBe(specialMessage);
    });

    test('should send message when button clicked', async () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => btn.textContent.includes('📤') || btn.getAttribute('aria-label')?.includes('send'));
      
      expect(sendButton).toBeDefined();
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Message Display', () => {
    test('should display user message after sending', async () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => btn.textContent.includes('📤') || btn.getAttribute('aria-label')?.includes('send'));
      
      expect(sendButton).toBeDefined();
      fireEvent.change(textarea, { target: { value: 'Hello assistant' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Hello assistant')).toBeInTheDocument();
      });
    });

    test('should display assistant response after API call', async () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => btn.textContent.includes('📤') || btn.getAttribute('aria-label')?.includes('send'));
      
      expect(sendButton).toBeDefined();
      fireEvent.change(textarea, { target: { value: 'Book tickets' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/great! i can help you book tickets/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Voice Integration', () => {
    test('should render voice input button', () => {
      render(<ChatAssistant />);
      const buttons = screen.getAllByRole('button');
      const voiceButton = buttons.find(btn => btn.textContent.includes('🎤'));
      expect(voiceButton).toBeDefined();
    });

    test('should call startListening when voice button clicked', () => {
      render(<ChatAssistant />);
      const buttons = screen.getAllByRole('button');
      const voiceButton = buttons.find(btn => btn.textContent.includes('🎤'));
      
      expect(voiceButton).toBeDefined();
      fireEvent.click(voiceButton);
      expect(mockStartListening).toHaveBeenCalled();
    });
  });

  describe('API Integration', () => {
    test('should call API when message is sent', async () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => btn.textContent.includes('📤') || btn.getAttribute('aria-label')?.includes('send'));
      
      expect(sendButton).toBeDefined();
      fireEvent.change(textarea, { target: { value: 'Book tickets' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/llm/parse'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        );
      });
    });

    test('should handle API errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(btn => btn.textContent.includes('📤') || btn.getAttribute('aria-label')?.includes('send'));
      
      expect(sendButton).toBeDefined();
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/sorry.*trouble/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Text-to-Speech Integration', () => {
    test('should have TTS toggle button', () => {
      render(<ChatAssistant />);
      const buttons = screen.getAllByRole('button');
      const ttsButton = buttons.find(btn => btn.textContent.includes('🔊') || btn.textContent.includes('🔇'));
      expect(ttsButton).toBeDefined();
    });

    test('should toggle TTS button state', () => {
      render(<ChatAssistant />);
      const buttons = screen.getAllByRole('button');
      const ttsButton = buttons.find(btn => btn.textContent.includes('🔊') || btn.textContent.includes('🔇'));
      
      expect(ttsButton).toBeDefined();
      const initialText = ttsButton.textContent;
      fireEvent.click(ttsButton);
      expect(ttsButton.textContent).not.toBe(initialText);
    });
  });

  describe('Component Structure', () => {
    test('should render textarea with aria-label', () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label');
    });

    test('should render multiple buttons', () => {
      render(<ChatAssistant />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2); // At least send and voice buttons
    });
  });

  describe('Component Lifecycle', () => {
    test('should handle component mount', () => {
      const { container } = render(<ChatAssistant />);
      expect(container).toBeInTheDocument();
    });

    test('should handle component unmount without errors', () => {
      const { unmount } = render(<ChatAssistant />);
      expect(() => unmount()).not.toThrow();
    });

    test('should handle long input text', () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      const longMessage = 'Test message. '.repeat(50);
      
      fireEvent.change(textarea, { target: { value: longMessage } });
      expect(textarea.value).toBe(longMessage);
    });

    test('should handle special characters', () => {
      render(<ChatAssistant />);
      const textarea = screen.getByRole('textbox');
      const specialMessage = 'I need 🎫 tickets! #Auburn @TigerTix';
      
      fireEvent.change(textarea, { target: { value: specialMessage } });
      expect(textarea.value).toBe(specialMessage);
    });
  });
});