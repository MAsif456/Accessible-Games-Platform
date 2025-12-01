import { useState, useRef, useCallback } from 'react';

// Global reference to track all active recognition instances
const activeRecognitionInstances = new Set<any>();

// Function to stop all recognition instances (can be called from anywhere)
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
      // Ignore errors
    }
  });
  activeRecognitionInstances.clear();
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'completed' | 'error';

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

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [transcript, setTranscript] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>('');

  const getSpeechRecognition = useCallback((): SpeechRecognitionConstructor | null => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  const startRecording = useCallback(async () => {
    const SpeechRecognition = getSpeechRecognition();
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      setRecordingState('error');
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access to record voice.');
      setRecordingState('error');
      return;
    }

    // Stop ALL existing recognition instances (including voice assistant)
    // This is critical to avoid conflicts - only one recognition can use the microphone at a time
    stopAllRecognitionInstances();

    // Clean up our own existing recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch {
        // Ignore errors when cleaning up
      }
      recognitionRef.current = null;
    }

    // Longer delay to ensure previous recognition is fully stopped and doesn't restart
    // The voice assistant's onend handler might try to restart, so we need enough time
    await new Promise(resolve => setTimeout(resolve, 600));

    setError(null);
    setRecordingState('recording');
    finalTranscriptRef.current = '';
    setTranscript(''); // Clear previous transcript for fresh start

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    // Register this instance
    activeRecognitionInstances.add(recognition);

    recognition.onresult = (event: any) => {
      if (!event || !event.results) {
        console.log('No results in recognition event');
        return;
      }
      
      // Use resultIndex to only process NEW results (prevents duplicates)
      // resultIndex tells us where to start processing from
      const startIndex = event.resultIndex || 0;
      console.log('Recognition result received, starting from index:', startIndex, 'total results:', event.results.length);
      
      let interimTranscript = '';
      let newFinalTranscript = '';

      // Only process results from resultIndex onwards (new results only)
      for (let i = startIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || !result[0]) continue;
        
        const transcript = result[0].transcript;
        console.log(`Result ${i}: "${transcript}" (isFinal: ${result.isFinal})`);
        
        if (result.isFinal) {
          // Only add to finalTranscript if it's new (not already in finalTranscriptRef)
          newFinalTranscript += transcript + ' ';
        } else {
          // Interim results (still being processed)
          interimTranscript += transcript;
        }
      }

      // Update final transcript only with NEW finalized results
      if (newFinalTranscript) {
        finalTranscriptRef.current += newFinalTranscript;
        // Show final + any remaining interim
        const currentTranscript = (finalTranscriptRef.current + interimTranscript).trim();
        console.log('Setting transcript (final):', currentTranscript);
        setTranscript(currentTranscript);
      } else if (interimTranscript) {
        // Show interim results in real-time (these update as you speak)
        const currentTranscript = (finalTranscriptRef.current + interimTranscript).trim();
        console.log('Setting transcript (interim):', currentTranscript);
        setTranscript(currentTranscript);
      }
    };

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
          // User stopped recording, not an error
          console.log('Recognition aborted (user action)');
          return;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      console.error('Setting error state:', errorMessage);
      setError(errorMessage);
      setRecordingState('error');
    };

    recognition.onend = () => {
      // Remove from active instances
      activeRecognitionInstances.delete(recognition);
      
      if (recordingState === 'recording') {
        // If we were recording and it ended unexpectedly, mark as completed
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
      
      if (err?.name === 'InvalidStateError' || err?.message?.includes('already started')) {
        // Recognition might already be running, try stopping and restarting
        console.log('Recognition already started, attempting to restart...');
        try {
          recognition.stop();
        } catch {
          // Ignore stop errors
        }
        setTimeout(() => {
          try {
            recognition.start();
            console.log('Recognition restarted successfully');
          } catch (retryErr: any) {
            console.error('Failed to restart recognition:', retryErr);
            setError('Failed to start recording. Another voice service may be active. Please try again.');
            setRecordingState('error');
          }
        }, 300);
      } else {
        const errorMsg = err?.message || 'Unknown error';
        console.error('Recognition start error:', errorMsg);
        setError(`Failed to start recording: ${errorMsg}. Please check your microphone permissions.`);
        setRecordingState('error');
      }
    }
  }, [getSpeechRecognition, recordingState]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        activeRecognitionInstances.delete(recognitionRef.current);
        recognitionRef.current.stop();
        setRecordingState('processing');
        
        // Give it a moment to finalize, then mark as completed
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

