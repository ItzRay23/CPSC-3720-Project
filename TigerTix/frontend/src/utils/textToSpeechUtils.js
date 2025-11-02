/**
 * @fileoverview Text-to-Speech utilities for voice feedback
 */

/**
 * Text-to-Speech configuration
 */
const TTS_CONFIG = {
  rate: 0.8,      // Speaking rate (0.1 to 10)
  pitch: 1.0,     // Voice pitch (0 to 2)
  volume: 0.8,    // Volume (0 to 1)
  lang: 'en-US'   // Language
};

/**
 * Available voice types
 */
const VOICE_TYPES = {
  SYSTEM: 'system',
  ASSISTANT: 'assistant',
  NOTIFICATION: 'notification',
  ERROR: 'error'
};

/**
 * Voice presets for different types of messages
 */
const VOICE_PRESETS = {
  [VOICE_TYPES.SYSTEM]: {
    rate: 0.9,
    pitch: 1.0,
    volume: 0.7
  },
  [VOICE_TYPES.ASSISTANT]: {
    rate: 0.8,
    pitch: 1.1,
    volume: 0.8
  },
  [VOICE_TYPES.NOTIFICATION]: {
    rate: 1.0,
    pitch: 1.2,
    volume: 0.6
  },
  [VOICE_TYPES.ERROR]: {
    rate: 0.7,
    pitch: 0.9,
    volume: 0.9
  }
};

/**
 * Check if text-to-speech is supported
 * @returns {boolean} True if TTS is supported
 */
export const isTextToSpeechSupported = () => {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};

/**
 * Get available voices
 * @returns {Promise<SpeechSynthesisVoice[]>} Array of available voices
 */
export const getAvailableVoices = () => {
  return new Promise((resolve) => {
    if (!isTextToSpeechSupported()) {
      resolve([]);
      return;
    }

    let voices = speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      resolve(voices);
    } else {
      // Wait for voices to load
      speechSynthesis.onvoiceschanged = () => {
        voices = speechSynthesis.getVoices();
        resolve(voices);
      };
    }
  });
};

/**
 * Find the best voice for the given language and preferences
 * @param {string} language - Preferred language (e.g., 'en-US')
 * @param {boolean} preferFemale - Prefer female voice
 * @returns {Promise<SpeechSynthesisVoice|null>} Best matching voice
 */
export const findBestVoice = async (language = 'en-US', preferFemale = true) => {
  const voices = await getAvailableVoices();
  if (voices.length === 0) return null;

  // Filter by language
  const languageVoices = voices.filter(voice => 
    voice.lang.toLowerCase().startsWith(language.toLowerCase().split('-')[0])
  );

  if (languageVoices.length === 0) {
    // Fallback to any English voice
    const englishVoices = voices.filter(voice => 
      voice.lang.toLowerCase().startsWith('en')
    );
    return englishVoices[0] || voices[0];
  }

  // Prefer local voices
  const localVoices = languageVoices.filter(voice => voice.localService);
  const voicesToSearch = localVoices.length > 0 ? localVoices : languageVoices;

  // Try to find preferred gender
  if (preferFemale) {
    const femaleVoice = voicesToSearch.find(voice => 
      voice.name.toLowerCase().includes('female') ||
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('samantha') ||
      voice.name.toLowerCase().includes('victoria') ||
      voice.name.toLowerCase().includes('zira')
    );
    if (femaleVoice) return femaleVoice;
  } else {
    const maleVoice = voicesToSearch.find(voice => 
      voice.name.toLowerCase().includes('male') ||
      voice.name.toLowerCase().includes('man') ||
      voice.name.toLowerCase().includes('david') ||
      voice.name.toLowerCase().includes('mark')
    );
    if (maleVoice) return maleVoice;
  }

  return voicesToSearch[0];
};

/**
 * Speak text using text-to-speech
 * @param {string} text - Text to speak
 * @param {Object} options - TTS options
 * @returns {Promise<void>} Promise that resolves when speech is complete
 */
export const speakText = async (text, options = {}) => {
  if (!isTextToSpeechSupported() || !text.trim()) {
    return Promise.resolve();
  }

  // Stop any current speech
  speechSynthesis.cancel();

  const {
    rate = TTS_CONFIG.rate,
    pitch = TTS_CONFIG.pitch,
    volume = TTS_CONFIG.volume,
    lang = TTS_CONFIG.lang,
    voice = null,
    type = VOICE_TYPES.ASSISTANT,
    onStart = null,
    onEnd = null,
    onError = null
  } = options;

  return new Promise(async (resolve, reject) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply preset if type is specified
      if (VOICE_PRESETS[type]) {
        const preset = VOICE_PRESETS[type];
        utterance.rate = preset.rate;
        utterance.pitch = preset.pitch;
        utterance.volume = preset.volume;
      }
      
      // Override with custom options
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      utterance.lang = lang;

      // Set voice if specified, otherwise find best voice
      if (voice) {
        utterance.voice = voice;
      } else {
        const bestVoice = await findBestVoice(lang);
        if (bestVoice) {
          utterance.voice = bestVoice;
        }
      }

      // Event handlers
      utterance.onstart = () => {
        console.log('🔊 TTS started:', text.substring(0, 50) + '...');
        if (onStart) onStart();
      };

      utterance.onend = () => {
        console.log('🔊 TTS completed');
        if (onEnd) onEnd();
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('🔊 TTS error:', event.error);
        if (onError) onError(event.error);
        reject(new Error(`TTS Error: ${event.error}`));
      };

      // Start speaking
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('🔊 TTS failed:', error);
      if (onError) onError(error);
      reject(error);
    }
  });
};

/**
 * Stop current speech
 */
export const stopSpeaking = () => {
  if (isTextToSpeechSupported()) {
    speechSynthesis.cancel();
  }
};

/**
 * Pause current speech
 */
export const pauseSpeaking = () => {
  if (isTextToSpeechSupported()) {
    speechSynthesis.pause();
  }
};

/**
 * Resume paused speech
 */
export const resumeSpeaking = () => {
  if (isTextToSpeechSupported()) {
    speechSynthesis.resume();
  }
};

/**
 * Check if currently speaking
 * @returns {boolean} True if speaking
 */
export const isSpeaking = () => {
  return isTextToSpeechSupported() && speechSynthesis.speaking;
};

/**
 * Check if speech is paused
 * @returns {boolean} True if paused
 */
export const isPaused = () => {
  return isTextToSpeechSupported() && speechSynthesis.paused;
};

/**
 * Speak a greeting message
 * @param {string} userName - User's name (optional)
 */
export const speakGreeting = async (userName = '') => {
  const greeting = userName 
    ? `Hello ${userName}, how can I help you with your TigerTix booking today?`
    : 'Hello! How can I help you with your TigerTix booking today?';
    
  return speakText(greeting, { type: VOICE_TYPES.ASSISTANT });
};

/**
 * Speak an error message
 * @param {string} error - Error message
 */
export const speakError = async (error) => {
  const cleanError = removeEmojisAndSymbols(error);
  const message = `Sorry, there was an error: ${cleanError}`;
  return speakText(message, { type: VOICE_TYPES.ERROR });
};

/**
 * Speak a confirmation message
 * @param {string} action - Action that was completed
 */
export const speakConfirmation = async (action) => {
  const cleanAction = removeEmojisAndSymbols(action);
  const message = `${cleanAction} completed successfully.`;
  return speakText(message, { type: VOICE_TYPES.NOTIFICATION });
};

/**
 * Speak voice input status
 * @param {string} status - Current status
 */
export const speakStatus = async (status) => {
  const statusMessages = {
    listening: 'Listening for your voice input',
    processing: 'Processing your voice input',
    error: 'Voice input error occurred',
    ready: 'Voice input is ready',
    keyword_detected: 'Keyword detected, continuing to listen'
  };
  
  const message = statusMessages[status] || removeEmojisAndSymbols(status);
  return speakText(message, { 
    type: VOICE_TYPES.SYSTEM,
    volume: 0.5,
    rate: 1.0
  });
};

/**
 * Convert newlines to natural speech pauses using punctuation
 * @param {string} text - Text with newlines
 * @returns {string} Text with punctuation for natural TTS pauses
 */
export const convertNewlinesToPauses = (text) => {
  return text
    .replace(/\n\s*•\s*/g, '. ')         // Convert bullet points to periods for natural pauses
    .replace(/\n\s*\d+\.\s*/g, '. ')     // Convert numbered lists to periods
    .replace(/\n\s*-\s*/g, '. ')         // Convert dashes to periods
    .replace(/\n{2,}/g, '. ')            // Convert multiple newlines to periods (paragraph breaks)
    .replace(/\n/g, ', ')                // Convert single newlines to commas (short pauses)
    .replace(/[.,]{2,}/g, '.')           // Clean up multiple punctuation marks
    .replace(/,\s*\./g, '.')             // Clean up comma-period combinations
    .replace(/\s+/g, ' ')                // Normalize whitespace
    .trim();
};

/**
 * Remove emojis and other symbols that TTS shouldn't read
 * @param {string} text - Text to clean
 * @returns {string} Text without emojis
 */
export const removeEmojisAndSymbols = (text) => {
  return text
    // Remove emojis (comprehensive Unicode ranges)
    .replace(/[\u{1f600}-\u{1f64f}]/gu, '') // Emoticons
    .replace(/[\u{1f300}-\u{1f5ff}]/gu, '') // Misc symbols
    .replace(/[\u{1f680}-\u{1f6ff}]/gu, '') // Transport & map symbols
    .replace(/[\u{1f1e0}-\u{1f1ff}]/gu, '') // Regional indicators (flags)
    .replace(/[\u{2600}-\u{26ff}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27bf}]/gu, '')   // Dingbats
    .replace(/[\u{1f900}-\u{1f9ff}]/gu, '') // Supplemental symbols
    .replace(/[\u{1f018}-\u{1f270}]/gu, '') // Various symbols
    // Remove common symbols that sound awkward in TTS
    .replace(/[•◦▪▫▸▹►▻‣⁃]/g, '')      // Bullet points
    .replace(/[→←↑↓↔]/g, '')             // Arrows
    .replace(/[★☆✓✗✘]/g, '')            // Stars and checkmarks
    .replace(/[™®©]/g, '')               // Trademark symbols
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Process and speak assistant response
 * @param {string} response - Assistant response text
 * @param {Object} options - Speaking options
 */
export const speakAssistantResponse = async (response, options = {}) => {
  if (!response || response.trim().length === 0) return;
  
  // Clean up the response for better TTS
  let cleanResponse = response
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic markdown
    .replace(/`(.*?)`/g, '$1')       // Remove code markdown
    .replace(/#{1,6}\s/g, '')        // Remove headers
    .trim();
    
  // Convert newlines to natural pauses
  cleanResponse = convertNewlinesToPauses(cleanResponse);
    
  // Remove emojis and symbols that TTS shouldn't read
  cleanResponse = removeEmojisAndSymbols(cleanResponse);
    
  // Limit length for TTS (too long responses can be overwhelming)
  if (cleanResponse.length > 500) {
    cleanResponse = cleanResponse.substring(0, 500) + '... Would you like me to continue?';
  }
  
  return speakText(cleanResponse, {
    type: VOICE_TYPES.ASSISTANT,
    ...options
  });
};

export { VOICE_TYPES };