/**
 * @fileoverview Voice recognition utilities and browser compatibility checks
 */

/**
 * Check if the browser supports Speech Recognition
 * @returns {boolean} True if Speech Recognition is supported
 */
export const isSpeechRecognitionSupported = () => {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
};

/**
 * Check if the browser supports Speech Synthesis (Text-to-Speech)
 * @returns {boolean} True if Speech Synthesis is supported
 */
export const isSpeechSynthesisSupported = () => {
  return 'speechSynthesis' in window;
};

/**
 * Get the Speech Recognition constructor
 * @returns {SpeechRecognition|null} Speech Recognition constructor or null if not supported
 */
export const getSpeechRecognition = () => {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition;
};

/**
 * Get browser compatibility information
 * @returns {Object} Browser compatibility details
 */
export const getBrowserCompatibility = () => {
  const userAgent = navigator.userAgent;
  const isChrome = /Chrome/.test(userAgent);
  const isEdge = /Edg/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);

  return {
    browser: isChrome ? 'Chrome' : isEdge ? 'Edge' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : 'Unknown',
    speechRecognition: isSpeechRecognitionSupported(),
    speechSynthesis: isSpeechSynthesisSupported(),
    recommendedExperience: isChrome || isEdge,
    limitedSupport: isSafari || isFirefox
  };
};

/**
 * Request microphone permission
 * @returns {Promise<boolean>} True if permission granted
 */
export const requestMicrophonePermission = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('MediaDevices API not supported');
      return false;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately as we only need permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
};

/**
 * Clean and preprocess voice input text
 * @param {string} text - Raw speech recognition text
 * @returns {string} Cleaned text
 */
export const preprocessVoiceText = (text) => {
  if (!text) return '';
  
  return text
    // Trim whitespace
    .trim()
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Capitalize first letter
    .replace(/^./, str => str.toUpperCase())
    // Add period if missing punctuation at end
    .replace(/([^.!?])$/, '$1.');
};

/**
 * Voice recognition error messages
 */
export const VOICE_ERROR_MESSAGES = {
  'no-speech': 'No speech was detected. Please try speaking again.',
  'audio-capture': 'Audio capture failed. Please check your microphone.',
  'not-allowed': 'Microphone access denied. Please allow microphone access in your browser settings.',
  'network': 'Network error occurred. Please check your internet connection.',
  'aborted': 'Speech recognition was aborted.',
  'language-not-supported': 'Language not supported.',
  'service-not-allowed': 'Speech recognition service not allowed.',
  'bad-grammar': 'Grammar error in speech recognition.',
  'default': 'An error occurred with speech recognition. Please try again.'
};

/**
 * Get user-friendly error message
 * @param {string} errorCode - Speech recognition error code
 * @returns {string} User-friendly error message
 */
export const getVoiceErrorMessage = (errorCode) => {
  return VOICE_ERROR_MESSAGES[errorCode] || VOICE_ERROR_MESSAGES.default;
};