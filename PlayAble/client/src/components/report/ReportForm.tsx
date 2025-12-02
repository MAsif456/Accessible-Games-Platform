import React, { useState, useEffect } from 'react';
import { ReportType, submitReport } from '../../services/reportApi';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { useVoiceAssistant } from '../../context/VoiceAssistantContext';
import { useAuth } from '../../context/AuthContext';

interface ReportFormProps {
  type: ReportType;
  gameId?: string;
  reviewId?: string;
  onSuccess?: () => void;
}

const MIN_CHARS = 10;
const MAX_CHARS = 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ReportForm: React.FC<ReportFormProps> = ({ type, gameId, reviewId, onSuccess }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [showVoiceNavError, setShowVoiceNavError] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const baseDescriptionTextRef = React.useRef<string>(''); // Track text before recording started

  const { 
    cancelListening, 
    forceStopRecognition,
    microphoneActive,
    voiceInputEnabled
  } = useVoiceAssistant();
  const {
    transcript: voiceTranscript,
    isRecording: isVoiceRecording,
    error: voiceError,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
    clearTranscript: clearVoiceTranscript,
    hasTranscript: hasVoiceTranscript,
  } = useVoiceRecording();

  const requiresContact = type === 'general';
  const trimmedDescription = description.trim();
  const hasValidDescription =
    trimmedDescription.length >= MIN_CHARS && trimmedDescription.length <= MAX_CHARS;

  const contactEmail = (user?.email ?? '').trim();
  const contactName = (user?.name ?? '').trim();

  const canSubmit =
    (hasValidDescription || hasVoiceTranscript) &&
    (!requiresContact || (contactEmail && EMAIL_REGEX.test(contactEmail)));

  // Start voice recording - check if voice navigation is active first
  const handleStartRecording = async () => {
    // Check if voice navigation is active (microphone active AND voice input enabled)
    // This means voice navigation is ready to use the microphone
    const isVoiceNavigationActive = microphoneActive && voiceInputEnabled;
    
    if (isVoiceNavigationActive) {
      // Show the inline error message
      setShowVoiceNavError(true);
      return;
    }
    
    // Clear any previous errors
    setShowVoiceNavError(false);
    
    // Save current text as base before starting recording
    baseDescriptionTextRef.current = description.trim();
    
    // Temporarily pause voice assistant to avoid browser conflicts
    // (Browsers don't support multiple recognition instances simultaneously)
    if (forceStopRecognition) {
      forceStopRecognition();
    }
    cancelListening();
    
    // Brief delay to ensure voice assistant recognition stops
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Start recording
    await startVoiceRecording();
  };

  // Clear error when voice navigation is disabled
  useEffect(() => {
    const isVoiceNavigationActive = microphoneActive && voiceInputEnabled;
    
    if (!isVoiceNavigationActive) {
      setShowVoiceNavError(false);
    }
  }, [microphoneActive, voiceInputEnabled]);

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

    if (requiresContact) {
      if (!contactEmail) {
        setContactError('A valid contact email is required to submit this report.');
        return;
      }
      if (!EMAIL_REGEX.test(contactEmail)) {
        setContactError('Please update your account email before submitting this report.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldError(null);
    setContactError(null);

    try {
      await submitReport({
        type,
        description: hasValidDescription ? trimmedDescription : undefined,
        transcript: hasVoiceTranscript && !hasValidDescription ? voiceTranscript.trim() : undefined,
        reporterEmail: requiresContact ? contactEmail : user?.email,
        reporterName: contactName || undefined,
        reporterId: user?.id,
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
          <div className="report-form__voice-error-inline" role="alert" aria-live="polite">
            <p className="report-form__voice-error-inline-text">
              {voiceError}
            </p>
          </div>
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
        {showVoiceNavError && microphoneActive && voiceInputEnabled && (
          <div className="report-form__voice-error-inline" role="alert" aria-live="polite">
            <p className="report-form__voice-error-inline-text">
              Voice navigation must be turned off for voice recording to work. Please disable voice navigation in Settings or mute the microphone in the navbar, then try again.
            </p>
          </div>
        )}
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
      {contactError && (
        <p className="report-form__error" role="alert">
          {contactError}
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
