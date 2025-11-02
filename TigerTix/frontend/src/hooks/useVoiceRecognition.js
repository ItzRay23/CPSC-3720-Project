/**
 * @fileoverview Advanced voice recognition hook with enhanced features
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getSpeechRecognition, 
  getBrowserCompatibility,
  requestMicrophonePermission,
  preprocessVoiceText,
  getVoiceErrorMessage 
} from '../utils/voiceUtils';

/**
 * Advanced voice recognition hook with real-time processing
 * @param {Object} options - Configuration options
 * @returns {Object} Voice recognition state and controls
 */
export const useVoiceRecognition = (options = {}) => {
  const {
    autoSend = false,
    continuous = false,
    interimResults = true,
    language = 'en-US',
    maxAlternatives = 3,
    confidenceThreshold = 0.7,
    onResult = null,
    onError = null,
    onStatusChange = null,
    activationKeywords = ['hey tigertix', 'tiger tix', 'tigertix']
  } = options;

  // State
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [alternatives, setAlternatives] = useState([]);
  const [browserInfo, setBrowserInfo] = useState(null);
  const [isKeywordActivated, setIsKeywordActivated] = useState(false);

  // Refs
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const keywordTimeoutRef = useRef(null);

  // Status change callback
  const notifyStatusChange = useCallback((status, data = {}) => {
    if (onStatusChange) {
      onStatusChange(status, data);
    }
  }, [onStatusChange]);

  /**
   * Handle final result processing
   */
  const handleFinalResult = useCallback((finalTranscript, confidence, alternatives) => {
    // Confidence check
    if (confidence < confidenceThreshold && confidence > 0) {
      notifyStatusChange('low_confidence', { 
        transcript: finalTranscript, 
        confidence,
        alternatives 
      });
    }

    // Call result callback
    if (onResult) {
      onResult({
        transcript: finalTranscript,
        confidence,
        alternatives,
        autoSend: autoSend && confidence >= confidenceThreshold
      });
    }

    notifyStatusChange('result', { 
      transcript: finalTranscript, 
      confidence, 
      alternatives,
      autoSend: autoSend && confidence >= confidenceThreshold
    });
  }, [confidenceThreshold, autoSend, onResult, notifyStatusChange]);

  /**
   * Remove activation keywords from transcript
   */
  const removeKeywords = useCallback((text, keywords) => {
    let cleaned = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      cleaned = cleaned.replace(regex, '').trim();
    });
    return cleaned.replace(/\s+/g, ' ').trim();
  }, []);

  /**
   * Initialize Speech Recognition with enhanced settings
   */
  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Enhanced configuration
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = maxAlternatives;

    // Event handlers
    recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      setIsListening(true);
      setIsProcessing(false);
      setError('');
      setTranscript('');
      setInterimTranscript('');
      notifyStatusChange('listening');
    };

    recognition.onresult = (event) => {
      console.log('🎤 Voice recognition result received');
      
      let finalTranscript = '';
      let interimText = '';
      let bestConfidence = 0;
      let allAlternatives = [];

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const resultText = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += resultText;
          bestConfidence = Math.max(bestConfidence, result[0].confidence || 0);
          
          // Collect alternatives
          for (let j = 0; j < result.length; j++) {
            allAlternatives.push({
              transcript: result[j].transcript,
              confidence: result[j].confidence || 0
            });
          }
        } else {
          interimText += resultText;
        }
      }

      // Update state
      setInterimTranscript(interimText);
      
      if (finalTranscript) {
        const cleanedTranscript = preprocessVoiceText(finalTranscript);
        setTranscript(cleanedTranscript);
        setConfidence(bestConfidence);
        setAlternatives(allAlternatives);
        setIsProcessing(true);
        
        console.log('🎤 Final transcript:', cleanedTranscript, 'Confidence:', bestConfidence);
        
        // Check for activation keywords
        const lowerTranscript = cleanedTranscript.toLowerCase();
        const hasKeyword = activationKeywords.some(keyword => 
          lowerTranscript.includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
          setIsKeywordActivated(true);
          notifyStatusChange('keyword_detected', { transcript: cleanedTranscript });
          
          // Remove keyword from transcript
          const cleanedWithoutKeyword = removeKeywords(cleanedTranscript, activationKeywords);
          
          if (cleanedWithoutKeyword.trim()) {
            handleFinalResult(cleanedWithoutKeyword, bestConfidence, allAlternatives);
          }
        } else {
          handleFinalResult(cleanedTranscript, bestConfidence, allAlternatives);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('🎤 Voice recognition error:', event.error);
      const errorMessage = getVoiceErrorMessage(event.error);
      setError(errorMessage);
      setIsListening(false);
      setIsProcessing(false);
      isListeningRef.current = false;
      
      notifyStatusChange('error', { error: errorMessage, code: event.error });
      
      if (onError) {
        onError(event.error, errorMessage);
      }
    };

    recognition.onend = () => {
      console.log('🎤 Voice recognition ended');
      setIsListening(false);
      setIsProcessing(false);
      isListeningRef.current = false;
      
      // Reset keyword activation after a delay
      if (keywordTimeoutRef.current) {
        clearTimeout(keywordTimeoutRef.current);
      }
      keywordTimeoutRef.current = setTimeout(() => {
        setIsKeywordActivated(false);
      }, 2000);
      
      notifyStatusChange('stopped');
    };
  }, [continuous, interimResults, language, maxAlternatives, activationKeywords, notifyStatusChange, onError, handleFinalResult, removeKeywords]);

  // Initialize compatibility check
  useEffect(() => {
    const compatibility = getBrowserCompatibility();
    setBrowserInfo(compatibility);
    setIsSupported(compatibility.speechRecognition);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (keywordTimeoutRef.current) {
        clearTimeout(keywordTimeoutRef.current);
      }
    };
  }, []);

  // Initialize speech recognition after compatibility check
  useEffect(() => {
    if (isSupported) {
      initializeSpeechRecognition();
    }
  }, [isSupported, initializeSpeechRecognition]);

  /**
   * Start voice recognition
   */
  const startListening = useCallback(async () => {
    if (!isSupported || isListeningRef.current) return false;

    // Check microphone permission
    if (hasPermission === null) {
      const permitted = await requestMicrophonePermission();
      setHasPermission(permitted);
      if (!permitted) {
        const errorMsg = 'Microphone access is required for voice input';
        setError(errorMsg);
        notifyStatusChange('permission_denied');
        return false;
      }
    } else if (hasPermission === false) {
      const errorMsg = 'Microphone access denied. Please enable microphone access in your browser settings.';
      setError(errorMsg);
      notifyStatusChange('permission_denied');
      return false;
    }

    if (recognitionRef.current) {
      try {
        isListeningRef.current = true;
        recognitionRef.current.start();
        return true;
      } catch (error) {
        console.error('🎤 Failed to start voice recognition:', error);
        const errorMsg = 'Failed to start voice recognition';
        setError(errorMsg);
        isListeningRef.current = false;
        notifyStatusChange('start_failed', { error: errorMsg });
        return false;
      }
    }
    return false;
  }, [isSupported, hasPermission, notifyStatusChange]);

  /**
   * Stop voice recognition
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  /**
   * Toggle voice recognition
   */
  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
      return false;
    } else {
      return await startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * Clear current state
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setAlternatives([]);
    setError('');
    setIsKeywordActivated(false);
  }, []);

  return {
    // State
    isSupported,
    isListening,
    isProcessing,
    hasPermission,
    error,
    transcript,
    interimTranscript,
    confidence,
    alternatives,
    browserInfo,
    isKeywordActivated,
    
    // Actions
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    
    // Config
    confidenceThreshold,
    activationKeywords
  };
};