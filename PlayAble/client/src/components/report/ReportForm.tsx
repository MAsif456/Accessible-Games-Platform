import React, { useState, useEffect } from 'react';
import { ReportType, submitReport } from '../../services/reportApi';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { useVoiceAssistant } from '../../context/VoiceAssistantContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Props for the accessible report form. Depending on report `type`, will include gameId/reviewId.
 */
interface ReportFormProps {
  /** Type of the report (general, game, review) */
  type: ReportType;
  /** ID of the game being reported, if applicable */
  gameId?: string;
  /** ID of the review being reported, if applicable */
  reviewId?: string;
  /** Callback function to be called on successful report submission */
  onSuccess?: () => void;
}

// Define minimum and maximum character limits for the report description
const MIN_CHARS = 10;
const MAX_CHARS = 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ReportForm component for submitting various types of reports.
 * @param {ReportFormProps} props - Props for the report form component.
 * @returns {JSX.Element} - Rendered report form component.
 */
const ReportForm: React.FC<ReportFormProps> = ({ type, gameId, reviewId, onSuccess }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [showVoiceNavError, setShowVoiceNavError] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const baseDescriptionTextRef = React.useRef<string>(''); // Track text before recording started

  // Trimmed description for validation purposes
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
  // Derived validity to keep the submit handler small and readable
  const hasValidDescription =
    trimmedDescription.length >= MIN_CHARS && trimmedDescription.length <= MAX_CHARS;

  const isLoggedIn = !!user;
  const contactEmail = isLoggedIn ? (user?.email ?? '').trim() : '';
  const contactName = (user?.name ?? '').trim();

  // For general reports, logged-in users need a valid email, but non-logged-in users don't
  const hasValidContactEmail = !requiresContact || !isLoggedIn || (contactEmail && EMAIL_REGEX.test(contactEmail));
  
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const canSubmit =
    (hasValidDescription || hasVoiceTranscript) &&
    hasValidContactEmail;

  const getDescriptionError = () => {
    if (!hasSubmitted) return null;
    if (trimmedDescription.length === 0 && !hasVoiceTranscript) {
      return `Please provide at least ${MIN_CHARS} characters or add a voice recording.`;
    }
    if (trimmedDescription.length > 0 && trimmedDescription.length < MIN_CHARS) {
      return `Please provide at least ${MIN_CHARS} characters.`;
    }
    if (trimmedDescription.length > MAX_CHARS) {
      return `Please keep your report under ${MAX_CHARS} characters.`;
    }
    return null;
  };

  useEffect(() => {
    setFieldError(getDescriptionError());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedDescription, hasVoiceTranscript, hasSubmitted]);

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

  /**
   * Handle form submission.
   * @param {React.FormEvent} e - Form event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);

    const descriptionError = getDescriptionError();
    if (descriptionError) {
      setFieldError(descriptionError);
      return;
    }

    if (!canSubmit) {
      return;
    }

    // Stop recording if still active
    if (isVoiceRecording) {
      stopVoiceRecording();
    }

    // For general reports, validate contact email only for logged-in users
    if (requiresContact && isLoggedIn) {
      if (!contactEmail) {
        setContactError('A valid contact email is required to submit this report. Please update your account email.');
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
      // Submit the report
      await submitReport({
        type,
        description: hasValidDescription ? trimmedDescription : undefined,
        // Transcript support will be wired in later when voice recording is implemented
        transcript: hasVoiceTranscript && !hasValidDescription ? voiceTranscript.trim() : undefined,
        reporterEmail: requiresContact ? contactEmail : (user?.email || undefined),
        reporterName: contactName || undefined,
        reporterId: user?.id,
        gameId,
        reviewId,
      });

      // Reset form state after successful submission
      setDescription('');
      baseDescriptionTextRef.current = '';
      clearVoiceTranscript();
      setHasSubmitted(false);

      // Call the onSuccess callback if provided
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
    <form className="report-form" onSubmit={handleSubmit}>
      <div className="report-form__field-group">
        <div className="report-form__header-row">
          <label className="report-form__label" htmlFor="description">
            Description
          </label>
          <span className="report-form__counter">
            {description.length}/{MAX_CHARS}
          </span>
        </div>
        <textarea
          id="description"
          className="report-form__textarea"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={`Describe the issue in at least ${MIN_CHARS} characters...`}
        />
        {fieldError && (
          <p className="report-form__field-error" role="alert">
            {fieldError}
          </p>
        )}
        <div className="report-form__helper">
          You can also add a voice recording to provide more context.
        </div>
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
            <p
              className={`report-form__voice-transcript-text ${
                isVoiceRecording ? 'report-form__voice-transcript-text--live' : ''
              }`}
            >
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
              <span
                className="report-form__voice-icon report-form__voice-icon--recording"
                aria-hidden="true"
              />
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
          <div
            className="report-form__voice-error-inline"
            role="alert"
            aria-live="polite"
          >
            <p className="report-form__voice-error-inline-text">
              Voice navigation must be turned off for voice recording to work. Please disable
              voice navigation in Settings or mute the microphone in the navbar, then try again.
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
}

export default ReportForm;
