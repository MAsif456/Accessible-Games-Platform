import { useState, useRef, useCallback } from 'react';

/**
 * Global set tracking all active speech recognition instances.
 * Used to prevent conflicts when multiple components try to use the microphone simultaneously.
 * @type {Set<any>}
 */
const activeRecognitionInstances = new Set<any>();

/**
 * Stops all active speech recognition instances.
 * Ensures clean shutdown when switching between voice services (e.g., voice assistant to voice recording).
 * 
 * @function
 * @returns {void}
 */
export function stopAllRecognitionInstances() {
  activeRecognitionInstances.forEach((instance) => {
    try {
      if (instance && typeof instance.stop === 'function') {
        instance.stop();
      }
      if (instance && typeof instance.abort === 'function') {
        instance.abort();
      }
    } catch {
    }
  });
  activeRecognitionInstances.clear();
}

/**
 * Possible states for voice recording.
 * @typedef {'idle' | 'recording' | 'processing' | 'completed' | 'error'} RecordingState
 */
type RecordingState = 'idle' | 'recording' | 'processing' | 'completed' | 'error';

/**
 * Return type for the useVoiceRecording hook.
 * 
 * @interface UseVoiceRecordingReturn
 * @property {string} transcript - The current voice transcript text
 * @property {boolean} isRecording - Whether recording is currently active
 * @property {RecordingState} recordingState - Current state of the recording
 * @property {string | null} error - Error message if recording failed, null otherwise
 * @property {() => Promise<void>} startRecording - Function to start voice recording
 * @property {() => void} stopRecording - Function to stop voice recording
 * @property {() => void} clearTranscript - Function to clear the transcript
 * @property {boolean} hasTranscript - Whether there is any transcript text
 */
interface UseVoiceRecordingReturn {
  transcript: string;
  isRecording: boolean;
  recordingState: RecordingState;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
  hasTranscript: boolean;
}

/**
 * Browser Speech Recognition API interface.
 * @typedef {Object} BrowserSpeechRecognition
 * @property {() => void} start - Starts speech recognition
 * @property {() => void} stop - Stops speech recognition
 * @property {() => void} [abort] - Aborts speech recognition
 * @property {((event: any) => void) | null} onresult - Handler for recognition results
 * @property {((event: any) => void) | null} onerror - Handler for recognition errors
 * @property {(() => void) | null} onend - Handler for recognition end
 * @property {boolean} continuous - Whether recognition should continue after each result
 * @property {boolean} interimResults - Whether to return interim (partial) results
 * @property {string} lang - Language code for recognition
 */
type BrowserSpeechRecognition = {
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

/**
 * Constructor type for creating Speech Recognition instances.
 * @typedef {new () => BrowserSpeechRecognition} SpeechRecognitionConstructor
 */
type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

/**
 * useVoiceRecording Hook
 * 
 * Custom React hook for managing voice recording using the Web Speech Recognition API.
 * Provides functionality to start, stop, and manage voice transcription with proper
 * error handling and state management.
 * 
 * Features:
 * - Browser compatibility detection (Chrome, Edge, Safari)
 * - Microphone permission handling
 * - Real-time transcript updates (interim and final results)
 * - Conflict prevention with other voice services
 * - Error handling with user-friendly messages
 * 
 * @returns {UseVoiceRecordingReturn} Object containing recording state and control functions
 * 
 * @example
 * ```tsx
 * const { transcript, isRecording, startRecording, stopRecording } = useVoiceRecording();
 * 
 * const handleStart = async () => {
 *   await startRecording();
 * };
 * ```
 */
export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [transcript, setTranscript] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  // I use refs to persist the recognition instance and final transcript across renders without causing re-renders
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>('');

  /**
   * Gets the Speech Recognition constructor for the current browser.
   * Checks for both standard and webkit-prefixed versions since different browsers
   * expose the API differently.
   * 
   * @returns {SpeechRecognitionConstructor | null} The constructor if available, null otherwise
   */
  const getSpeechRecognition = useCallback((): SpeechRecognitionConstructor | null => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  /**
   * Starts voice recording using the Web Speech Recognition API.
   * 
   * Process:
   * 1. Checks browser support for speech recognition
   * 2. Requests microphone permission
   * 3. Stops any existing recognition instances
   * 4. Creates and configures a new recognition instance
   * 5. Sets up event handlers for results, errors, and end events
   * 6. Starts recognition
   * 
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If browser doesn't support speech recognition or microphone access is denied
   */
  const startRecording = useCallback(async () => {
    const SpeechRecognition = getSpeechRecognition();
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      setRecordingState('error');
      return;
    }

    // I request microphone permission early to fail fast with a clear error message
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access to record voice.');
      setRecordingState('error');
      return;
    }

    // Stop only our own previous recognition instance if it exists
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        if (recognitionRef.current.abort) {
          recognitionRef.current.abort();
        }
      } catch {
      }
      recognitionRef.current = null;
    }

    // Brief delay to ensure our previous instance has stopped
    await new Promise(resolve => setTimeout(resolve, 100));

    setError(null);
    setRecordingState('recording');
    finalTranscriptRef.current = '';
    setTranscript('');

    const recognition = new SpeechRecognition();
    // I enable continuous mode so recording doesn't stop after each phrase, and interim results to show live transcription
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    activeRecognitionInstances.add(recognition);

    recognition.onresult = (event: any) => {
      if (!event || !event.results) {
        console.log('No results in recognition event');
        return;
      }
      
      // I use resultIndex to process only new results, preventing duplicate words from being added to the transcript
      const startIndex = event.resultIndex || 0;
      console.log('Recognition result received, starting from index:', startIndex, 'total results:', event.results.length);
      
      let interimTranscript = '';
      let newFinalTranscript = '';

      for (let i = startIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || !result[0]) continue;
        
        const transcript = result[0].transcript;
        console.log(`Result ${i}: "${transcript}" (isFinal: ${result.isFinal})`);
        
        // I separate final and interim results to build a complete transcript while showing live updates
        if (result.isFinal) {
          newFinalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // I combine final and interim transcripts to show both confirmed text and live typing
      if (newFinalTranscript) {
        finalTranscriptRef.current += newFinalTranscript;
        const currentTranscript = (finalTranscriptRef.current + interimTranscript).trim();
        console.log('Setting transcript (final):', currentTranscript);
        setTranscript(currentTranscript);
      } else if (interimTranscript) {
        const currentTranscript = (finalTranscriptRef.current + interimTranscript).trim();
        console.log('Setting transcript (interim):', currentTranscript);
        setTranscript(currentTranscript);
      }
    };

    // I map specific error codes to user-friendly messages so users understand what went wrong and how to fix it
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error, event);
      let errorMessage = 'An error occurred during voice recording.';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone connection.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'aborted':
          // Recognition was aborted, likely because another recognition instance (voice assistant) is active
          console.log('Recognition aborted - another recognition instance may be active');
          errorMessage = 'Unable to start recording. The voice assistant may be active. Please stop the voice assistant or wait a moment and try again.';
          setError(errorMessage);
          setRecordingState('error');
          activeRecognitionInstances.delete(recognition);
          return;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      console.error('Setting error state:', errorMessage);
      setError(errorMessage);
      setRecordingState('error');
    };

    // I clean up the instance from the global set when recognition ends to prevent memory leaks
    recognition.onend = () => {
      activeRecognitionInstances.delete(recognition);
      
      if (recordingState === 'recording') {
        setRecordingState('completed');
      }
    };

    recognitionRef.current = recognition;

    try {
      console.log('Starting speech recognition...');
      recognition.start();
      console.log('Speech recognition started');
    } catch (err: any) {
      console.error('Error starting recognition:', err);
      activeRecognitionInstances.delete(recognition);
      
      // I handle the case where recognition is already running - this might happen if another recognition instance is active
      if (err?.name === 'InvalidStateError' || err?.message?.includes('already started')) {
        console.log('Recognition conflict detected - another recognition instance may be active');
        // Try once more after a brief delay
        setTimeout(() => {
          try {
            recognition.start();
            console.log('Recognition started successfully after retry');
          } catch (retryErr: any) {
            console.error('Failed to start recognition after retry:', retryErr);
            setError('Unable to start recording. The microphone may be in use by another service. You can try muting the voice assistant temporarily.');
            setRecordingState('error');
          }
        }, 500);
      } else {
        const errorMsg = err?.message || 'Unknown error';
        console.error('Recognition start error:', errorMsg);
        setError(`Failed to start recording: ${errorMsg}. Please check your microphone permissions.`);
        setRecordingState('error');
      }
    }
  }, [getSpeechRecognition, recordingState]);

  /**
   * Stops voice recording.
   * Sets state to 'processing' briefly before 'completed' to give the UI time to show a stopping state.
   * Removes the recognition instance from the global tracking set.
   * 
   * @returns {void}
   */
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        activeRecognitionInstances.delete(recognitionRef.current);
        recognitionRef.current.stop();
        setRecordingState('processing');
        
        setTimeout(() => {
          setRecordingState('completed');
        }, 500);
      } catch (err) {
        console.error('Error stopping recognition:', err);
        setRecordingState('completed');
      }
      recognitionRef.current = null;
    }
  }, []);

  /**
   * Clears the transcript and resets recording state to idle.
   * Also clears any error messages.
   * 
   * @returns {void}
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
    setError(null);
    setRecordingState('idle');
  }, []);

  return {
    transcript,
    isRecording: recordingState === 'recording',
    recordingState,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
    hasTranscript: transcript.trim().length > 0,
  };
}

