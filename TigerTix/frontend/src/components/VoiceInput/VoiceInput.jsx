/**
 * @component VoiceInput
 * @description Voice input component with speech recognition capability
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  isSpeechRecognitionSupported, 
  getSpeechRecognition, 
  getBrowserCompatibility,
  requestMicrophonePermission,
  preprocessVoiceText,
  getVoiceErrorMessage
} from '../../utils/voiceUtils';
import './VoiceInput.css';

const VoiceInput = ({ onVoiceInput, disabled = false, className = '' }) => {
  // State management
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState('');
  const [browserInfo, setBrowserInfo] = useState(null);

  // Refs
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  // Initialize component
  useEffect(() => {
    const compatibility = getBrowserCompatibility();
    setBrowserInfo(compatibility);
    setIsSupported(compatibility.speechRecognition);

    if (compatibility.speechRecognition) {
      initializeSpeechRecognition();
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  /**
   * Initialize Speech Recognition
   */
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Configuration
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Event handlers
    recognition.onstart = () => {
      console.log('Voice recognition started');
      setIsListening(true);
      setIsProcessing(false);
      setError('');
    };

    recognition.onresult = (event) => {
      console.log('Voice recognition result received');
      setIsProcessing(true);
      
      const result = event.results[0];
      if (result.isFinal) {
        const transcript = preprocessVoiceText(result[0].transcript);
        console.log('Voice input:', transcript);
        
        if (transcript && onVoiceInput) {
          onVoiceInput(transcript);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      const errorMessage = getVoiceErrorMessage(event.error);
      setError(errorMessage);
      setIsListening(false);
      setIsProcessing(false);
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      console.log('Voice recognition ended');
      setIsListening(false);
      setIsProcessing(false);
      isListeningRef.current = false;
    };
  };

  /**
   * Start voice recognition
   */
  const startListening = async () => {
    if (!isSupported || disabled || isListeningRef.current) return;

    // Check microphone permission first
    if (hasPermission === null) {
      const permitted = await requestMicrophonePermission();
      setHasPermission(permitted);
      if (!permitted) {
        setError('Microphone access is required for voice input');
        return;
      }
    } else if (hasPermission === false) {
      setError('Microphone access denied. Please enable microphone access in your browser settings.');
      return;
    }

    if (recognitionRef.current) {
      try {
        isListeningRef.current = true;
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        setError('Failed to start voice recognition');
        isListeningRef.current = false;
      }
    }
  };

  /**
   * Stop voice recognition
   */
  const stopListening = () => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
    }
  };

  /**
   * Toggle voice recognition
   */
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Don't render if not supported
  if (!isSupported) {
    return (
      <div className={`voice-input voice-input--unsupported ${className}`}>
        <div className="voice-input__error">
          <span className="voice-input__error-icon">⚠️</span>
          <span className="voice-input__error-text">
            Voice input not supported in this browser. 
            {browserInfo?.browser === 'Firefox' || browserInfo?.browser === 'Safari' ? 
              ' Try using Chrome or Edge for the best experience.' : ''}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-input ${className}`}>
      <button 
        className={`voice-input__button ${
          isListening ? 'voice-input__button--listening' : 
          isProcessing ? 'voice-input__button--processing' : 
          error ? 'voice-input__button--error' : ''
        }`}
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? 'Stop listening' : 'Click to speak'}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      >
        <span className="voice-input__icon">
          {isListening ? '🔴' : isProcessing ? '⏳' : error ? '❌' : '🎤'}
        </span>
      </button>

      {/* Status indicator */}
      <div className="voice-input__status">
        {isListening && (
          <span className="voice-input__status-text voice-input__status-text--listening">
            Listening...
          </span>
        )}
        {isProcessing && (
          <span className="voice-input__status-text voice-input__status-text--processing">
            Processing...
          </span>
        )}
        {error && (
          <span className="voice-input__status-text voice-input__status-text--error">
            {error}
          </span>
        )}
      </div>

      {/* Browser compatibility warning */}
      {browserInfo?.limitedSupport && (
        <div className="voice-input__warning">
          <small>
            Voice input has limited support in {browserInfo.browser}. 
            For the best experience, use Chrome or Edge.
          </small>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;