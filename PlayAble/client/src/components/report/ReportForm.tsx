import React, { useState } from 'react';
import { ReportType, submitReport } from '../../services/reportApi';

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

/**
 * ReportForm component for submitting various types of reports.
 * @param {ReportFormProps} props - Props for the report form component.
 * @returns {JSX.Element} - Rendered report form component.
 */
const ReportForm: React.FC<ReportFormProps> = ({ type, gameId, reviewId, onSuccess }) => {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [voiceRecorded, setVoiceRecorded] = useState(false);

  // Trimmed description for validation purposes
  const trimmedDescription = description.trim();
  // Derived validity to keep the submit handler small and readable
  const hasValidDescription =
    trimmedDescription.length >= MIN_CHARS && trimmedDescription.length <= MAX_CHARS;
  const canSubmit = hasValidDescription || voiceRecorded;

  /**
   * Handle form submission.
   * @param {React.FormEvent} e - Form event.
   */
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
      // Submit the report
      await submitReport({
        type,
        description: hasValidDescription ? trimmedDescription : undefined,
        // Transcript support will be wired in later when voice recording is implemented
        gameId,
        reviewId,
      });

      // Reset form state after successful submission
      setDescription('');
      setVoiceRecorded(false);

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
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`Describe the issue in at least ${MIN_CHARS} characters...`}
        />
        {fieldError && <div className="report-form__field-error">{fieldError}</div>}
        <div className="report-form__helper">
          You can also add a voice recording to provide more context.
        </div>
      </div>
      {errorMessage && <div className="report-form__error">{errorMessage}</div>}
      <button
        type="submit"
        className="report-form__submit"
        disabled={isSubmitting || !canSubmit}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  );
};

export default ReportForm;