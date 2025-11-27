import React, { useEffect, useState } from 'react';
import { getReviewById, reportReview, ReviewDto } from '../services/api';

interface ReportPageProps {
  reviewId: string;
  onBack: () => void;
}

const MIN_REASON_LENGTH = 10;

const ReportPage: React.FC<ReportPageProps> = ({ reviewId, onBack }) => {
  const [reasonText, setReasonText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewDto | null>(null);

  useEffect(() => {
    let isMounted = true;
    getReviewById(reviewId)
      .then(data => {
        if (!isMounted) return;
        setReview(data);
      })
      .catch(err => {
        console.error(err);
      });

    return () => {
      isMounted = false;
    };
  }, [reviewId]);

  const remaining = reasonText.length;
  const canSubmit = !submitting && reasonText.trim().length >= MIN_REASON_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await reportReview(reviewId, reasonText.trim());
      setSuccess('Your report has been submitted. Thank you for helping keep PlayAble safe.');
      setReasonText('');
    } catch (err) {
      console.error(err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const initials = review
    ? review.authorName
        .split(' ')
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??';

  const createdDate = review ? new Date(review.createdAt).toLocaleDateString() : '';

  return (
    <main className="report-review" aria-label="Report a Review">
      <nav className="report-review__breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="report-review__breadcrumb-link" onClick={onBack}>
          &larr; Back to game details
        </button>
      </nav>

      <header className="report-review__header">
        <div className="report-review__title-row">
          <span className="report-review__flag-icon" aria-hidden="true" />
          <h1 className="report-review__title">Report a Review</h1>
        </div>
        <p className="report-review__subtitle">
          Tell us what is wrong with this review so our moderation team can take a closer look.
        </p>
      </header>

      <section className="report-review__context" aria-label="Review context">
        <div className="report-review__context-card">
          <h2 className="report-review__context-heading">About this report</h2>
          <p className="report-review__context-body">
            You are reporting a review on this game. Our team will review your report as soon as
            possible.
          </p>
        </div>

        <article className="report-review__review-panel" aria-label="Review being reported">
          <h3 className="report-review__review-heading">Review you are reporting</h3>
          <div className="report-review__review-card">
            <div className="report-review__review-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="report-review__review-meta">
              <p className="report-review__review-author">{review?.authorName ?? 'Unknown user'}</p>
              {review && <p className="report-review__review-date">{createdDate}</p>}
            </div>
            <p className="report-review__review-text">
              {review?.body ?? 'Unable to load review.'}
            </p>
          </div>
        </article>
      </section>

      <form className="report-review__form" onSubmit={handleSubmit}>
        <section className="report-review__field" aria-label="Written description of the problem">
          <label className="report-review__label" htmlFor="report-reason">
            Written Description <span aria-hidden="true">*</span>
          </label>
          <p className="report-review__helper">
            Please describe why you think this review is inappropriate or incorrect. Minimum 10
            characters.
          </p>
          <textarea
            id="report-reason"
            className="report-review__textarea"
            rows={5}
            value={reasonText}
            onChange={e => setReasonText(e.target.value)}
            placeholder="Provide as much detail as you can so our team can understand the issue."
          />
          <div className="report-review__meta-row">
            <span className="report-review__counter" aria-live="polite">
              {remaining} characters
            </span>
            <span className="report-review__min-hint">Minimum {MIN_REASON_LENGTH} characters</span>
          </div>
        </section>

        <section className="report-review__field" aria-label="Optional voice recording">
          <h2 className="report-review__subheading">Voice Recording (Optional)</h2>
          <p className="report-review__helper">
            Record your explanation using your voice. The transcript will be attached to your report.
          </p>
          <button type="button" className="report-review__voice-button">
            <span className="report-review__voice-icon" aria-hidden="true" />
            Start Voice Recording
          </button>
        </section>

        {error && (
          <p className="report-review__status report-review__status--error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="report-review__status report-review__status--success" role="status">
            {success}
          </p>
        )}

        <div className="report-review__actions">
          <button
            type="button"
            className="report-review__secondary-btn"
            onClick={onBack}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="report-review__primary-btn"
            disabled={!canSubmit}
          >
            {submitting ? 'Submitting' : 'Submit Report'}
          </button>
        </div>
      </form>
    </main>
  );
};

export default ReportPage;
