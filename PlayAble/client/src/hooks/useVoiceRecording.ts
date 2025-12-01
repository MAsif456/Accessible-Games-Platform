import { useState, useRef, useCallback } from 'react';

// I track all active recognition instances globally to prevent conflicts when multiple components try to use the microphone simultaneously
const activeRecognitionInstances = new Set<any>();

// I stop all recognition instances to ensure clean shutdown when switching between voice services
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

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [transcript, setTranscript] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  // I use refs to persist the recognition instance and final transcript across renders without causing re-renders
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>('');

  // I check for browser support at runtime since different browsers expose the API differently
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

    // I request microphone permission early to fail fast with a clear error message
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access to record voice.');
      setRecordingState('error');
      return;
    }

    // I stop all other recognition instances first to prevent microphone conflicts
    stopAllRecognitionInstances();

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

    // I wait briefly to ensure previous recognition instances have fully stopped before starting a new one
    await new Promise(resolve => setTimeout(resolve, 300));

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
          console.log('Recognition aborted (user action)');
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
      
      // I handle the case where recognition is already running by stopping and restarting it, which can happen during rapid user interactions
      if (err?.name === 'InvalidStateError' || err?.message?.includes('already started')) {
        console.log('Recognition already started, attempting to restart...');
        try {
          recognition.stop();
        } catch {
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

  // I set state to 'processing' briefly before 'completed' to give the UI time to show a stopping state
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

