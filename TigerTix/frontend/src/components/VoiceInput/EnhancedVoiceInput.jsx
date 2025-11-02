/**
 * @fileoverview Enhanced VoiceInput component with advanced voice recognition
 */

import React from 'react';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import './EnhancedVoiceInput.css';

/**
 * Simple Voice Input Button Component matching send button style
 * @param {Object} props - Component props
 * @returns {JSX.Element} Simple voice input button
 */
const EnhancedVoiceInput = ({ 
  onVoiceInput, 
  className = '',
  disabled = false
}) => {
  const {
    isSupported,
    isListening,
    isProcessing,
    hasPermission,
    error,
    toggleListening
  } = useVoiceRecognition({
    autoSend: true,
    continuous: false,
    interimResults: false,
    confidenceThreshold: 0.6,
    onResult: (result) => {
      if (onVoiceInput && result.transcript) {
        onVoiceInput(result.transcript, {
          confidence: result.confidence,
          alternatives: result.alternatives,
          autoSend: result.autoSend
        });
      }
    },
    onStatusChange: (status, data) => {
      console.log(`🎤 Voice status: ${status}`, data);
    }
  });

  const handleClick = async () => {
    if (disabled || !isSupported) return;
    await toggleListening();
  };

  const getButtonText = () => {
    if (!isSupported) return '🚫';
    if (hasPermission === false) return '🚫';
    if (error) return '❌';
    if (isListening) return '🛑';
    if (isProcessing) return '⏳';
    return '🎤';
  };

  const getButtonClass = () => {
    let baseClass = `voice-btn ${className}`;
    
    if (!isSupported || hasPermission === false || error) {
      baseClass += ' voice-btn--disabled';
    } else if (isListening) {
      baseClass += ' voice-btn--listening';
    } else if (isProcessing) {
      baseClass += ' voice-btn--processing';
    }
    
    return baseClass;
  };

  const getTitle = () => {
    if (!isSupported) return 'Voice input not supported in this browser';
    if (hasPermission === false) return 'Microphone access denied';
    if (error) return `Voice error: ${error}`;
    if (isListening) return 'Click to stop listening';
    if (isProcessing) return 'Processing voice input...';
    return 'Click to start voice input';
  };

  return (
    <button
      className={getButtonClass()}
      onClick={handleClick}
      disabled={disabled || !isSupported || hasPermission === false}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      title={getTitle()}
      type="button"
    >
      {getButtonText()}
    </button>
  );
};

export default EnhancedVoiceInput;