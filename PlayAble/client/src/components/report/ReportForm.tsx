import React, { useState, useEffect } from 'react';
import { ReportType, submitReport } from '../../services/reportApi';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { useVoiceAssistant } from '../../context/VoiceAssistantContext';

interface ReportFormProps {
  type: ReportType;
  gameId?: string;
  reviewId?: string;
  onSuccess?: () => void;
}

const MIN_CHARS = 10;
const MAX_CHARS = 1000;

const ReportForm: React.FC<ReportFormProps> = ({ type, gameId, reviewId, onSuccess }) => {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const baseDescriptionTextRef = React.useRef<string>(''); // Track text before recording started

  const { cancelListening, forceStopRecognition, applyMicrophonePreference, applyVoiceInputPreference, microphoneActive: assistantMicActive, voiceInputEnabled: assistantVoiceEnabled } = useVoiceAssistant();
  const {
    transcript: voiceTranscript,
    isRecording: isVoiceRecording,
    error: voiceError,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
    clearTranscript: clearVoiceTranscript,
    hasTranscript: hasVoiceTranscript,
  } = useVoiceRecording();
  const wasMicActiveRef = React.useRef<boolean>(true); // Track if mic was active before recording
  const wasVoiceEnabledRef = React.useRef<boolean>(true); // Track if voice input was enabled before recording

  // Wrapper to stop voice assistant before starting recording
  const handleStartRecording = async () => {
    // Save current text as base before starting recording
    baseDescriptionTextRef.current = description.trim();
    
    // Save current state
    wasMicActiveRef.current = assistantMicActive;
    wasVoiceEnabledRef.current = assistantVoiceEnabled;
    
    // STEP 1: Disable voice input and microphone FIRST
    // This ensures canListen becomes false BEFORE we stop recognition
    // This prevents the onend handler from restarting
    if (assistantVoiceEnabled) {
      applyVoiceInputPreference(false);
    }
    if (assistantMicActive) {
      applyMicrophonePreference(false);
    }
    
    // STEP 2: Wait a moment for the settings to take effect
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // STEP 3: Force stop voice assistant recognition (now that canListen is false)
    if (forceStopRecognition) {
      forceStopRecognition();
    }
    cancelListening();
    
    // STEP 4: Longer delay to ensure voice assistant fully stops and all handlers finish
    // The onend handler checks canListen, which is now false, so it won't restart
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await startVoiceRecording();
  };

  // Restore voice assistant settings when recording stops
  useEffect(() => {
    if (!isVoiceRecording && (wasMicActiveRef.current || wasVoiceEnabledRef.current)) {
      // Small delay to ensure recording is fully stopped
      const restoreTimer = setTimeout(() => {
        // Restore in reverse order: microphone first, then voice input
        if (wasMicActiveRef.current) {
          applyMicrophonePreference(true);
        }
        if (wasVoiceEnabledRef.current) {
          applyVoiceInputPreference(true);
        }
        wasMicActiveRef.current = true;
        wasVoiceEnabledRef.current = true;
      }, 400);
      return () => clearTimeout(restoreTimer);
    }
  }, [isVoiceRecording, applyMicrophonePreference, applyVoiceInputPreference]);

  // Sync voice transcript to description textarea in real-time
  useEffect(() => {
    if (isVoiceRecording) {
      // Combine base text (from before recording) with current voice transcript
      const baseText = baseDescriptionTextRef.current;
      // Always update, even if transcript is empty (it will update as speech is detected)
      const combined = baseText && voiceTranscript 
        ? `${baseText} ${voiceTranscript}`.trim() 
        : voiceTranscript || baseText || '';
      setDescription(combined);
    }
  }, [voiceTranscript, isVoiceRecording]);

  const trimmedDescription = description.trim();
  const hasValidDescription =
    trimmedDescription.length >= MIN_CHARS && trimmedDescription.length <= MAX_CHARS;
  const canSubmit = hasValidDescription || hasVoiceTranscript;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmedDescription && trimmedDescription.length < MIN_CHARS) {
      setFieldError(`Please provide at least ${MIN_CHARS} characters.`);
      return;
    }

    if (trimmedDescription.length > MAX_CHARS) {
      setFieldError(`Please keep your report under ${MAX_CHARS} characters.`);
      return;
    }

    if (!canSubmit) {
      setFieldError(`Please provide at least ${MIN_CHARS} characters or add a voice recording.`);
      return;
    }

    // Stop recording if still active
    if (isVoiceRecording) {
      stopVoiceRecording();
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldError(null);

    try {
      await submitReport({
        type,
        description: hasValidDescription ? trimmedDescription : undefined,
        transcript: hasVoiceTranscript && !hasValidDescription ? voiceTranscript.trim() : undefined,
        gameId,
        reviewId,
      });

      setDescription('');
      baseDescriptionTextRef.current = '';
      clearVoiceTranscript();

      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setErrorMessage('Something went wrong while submitting your report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="report-form" onSubmit={handleSubmit} aria-label="Report form">
      <div className="report-form__field-group">
        <div className="report-form__header-row">
          <label htmlFor="report-description" className="report-form__label">
            Written Description
          </label>
        </div>
        <textarea
          id="report-description"
          className="report-form__textarea"
          value={description}
          onChange={e => {
            setDescription(e.target.value);
            if (fieldError) {
              setFieldError(null);
            }
          }}
          rows={4}
          placeholder="Please describe the issue you encountered in detail (minimum 10 characters)."
        />
        {fieldError && (
          <p className="report-form__field-error" role="alert">
            {fieldError}
          </p>
        )}
      </div>

      <section className="report-form__voice" aria-label="Voice recording">
        <h3 className="report-form__voice-title">Voice Recording</h3>
        <p className="report-form__voice-text">
          Record your report using your voice. Your speech will be typed directly into the description field above as you speak.
        </p>
        {voiceError && (
          <p className="report-form__field-error" role="alert">
            {voiceError}
          </p>
        )}
        {(hasVoiceTranscript || isVoiceRecording) && (
          <div className="report-form__voice-transcript">
            <p className="report-form__voice-transcript-label">
              {isVoiceRecording ? 'Live Transcript:' : 'Transcript:'}
            </p>
            <p className={`report-form__voice-transcript-text ${isVoiceRecording ? 'report-form__voice-transcript-text--live' : ''}`}>
              {voiceTranscript || (isVoiceRecording ? 'Listening...' : '')}
            </p>
          </div>
        )}
        <div className="report-form__voice-controls">
          {!isVoiceRecording ? (
            <button
              type="button"
              className="report-form__voice-button"
              onClick={handleStartRecording}
              disabled={isSubmitting}
            >
              <span className="report-form__voice-icon" aria-hidden="true" />
              <span className="report-form__voice-button-text">
                {hasVoiceTranscript ? 'Record Again' : 'Start Voice Recording'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="report-form__voice-button report-form__voice-button--recording"
              onClick={stopVoiceRecording}
              disabled={isSubmitting}
            >
              <span className="report-form__voice-icon report-form__voice-icon--recording" aria-hidden="true" />
              <span className="report-form__voice-button-text">Stop Recording</span>
            </button>
          )}
          {hasVoiceTranscript && !isVoiceRecording && (
            <button
              type="button"
              className="report-form__voice-button report-form__voice-button--clear"
              onClick={() => {
                setDescription(baseDescriptionTextRef.current);
                clearVoiceTranscript();
              }}
              disabled={isSubmitting}
            >
              <span className="report-form__voice-button-text">Clear Transcript</span>
            </button>
          )}
        </div>
        {isVoiceRecording && (
          <p className="report-form__voice-status">
            <span className="report-form__voice-status-dot" aria-hidden="true" />
            Recording... Speak now.
          </p>
        )}
      </section>

      {errorMessage && (
        <p className="report-form__error" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="report-form__actions">
        <button
          type="submit"
          className="report-form__submit"
          disabled={isSubmitting || isVoiceRecording}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
};

export default ReportForm;
