import React, { useState } from 'react';
import { ReportType, submitReport } from '../../services/reportApi';

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
  const [voiceRecorded, setVoiceRecorded] = useState(false);

 
  const trimmedDescription = description.trim();
  const hasValidDescription =
    trimmedDescription.length >= MIN_CHARS && trimmedDescription.length <= MAX_CHARS;
  const canSubmit = hasValidDescription || voiceRecorded;

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

    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldError(null);

    try {
      await submitReport({
        type,
        description: hasValidDescription ? trimmedDescription : undefined,
        // transcript support will be wired in later when voice recording is implemented
        gameId,
        reviewId,
      });

      
      setDescription('');
      setVoiceRecorded(false);

      
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

      <section className="report-form__voice" aria-label="Voice recording ">
        <h3 className="report-form__voice-title">Voice Recording </h3>
        <p className="report-form__voice-text">
          Record your report using your voice. The transcript will be added to your report.
        </p>
        <button
          type="button"
          className="report-form__voice-button"
          onClick={() => {
            // Placeholder hook for teammates to implement voice recording.
            // For now we simply toggle a flag so that voice-only reports can be submitted.
            setVoiceRecorded(prev => !prev);
          }}
        >
          <span aria-hidden="true">🎙</span> {voiceRecorded ? 'Voice Recorded' : 'Start Voice Recording'}
        </button>
      </section>

      {errorMessage && (
        <p className="report-form__error" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="report-form__actions">
        <button type="submit" className="report-form__submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
};

export default ReportForm;
