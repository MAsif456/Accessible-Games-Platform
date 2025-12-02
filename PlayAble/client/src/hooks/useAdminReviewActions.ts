import { useState } from 'react';
import { adminDeleteReview, adminReplyToReview, adminResolveReviewReport } from '../services/adminReviewsService';

export interface UseAdminReviewActionsOptions {
  showToast?: (message: string, type?: 'success' | 'error') => void;
  onRefreshReviews?: () => void;
  onRefreshReported?: () => void;
  onRefreshResolved?: () => void;
}

export const ADMIN_REPLY_MIN_CHARS = 10;
export const ADMIN_REPLY_MAX_CHARS = 1000;

export function useAdminReviewActions(options: UseAdminReviewActionsOptions = {}) {
  const { showToast, onRefreshReviews, onRefreshReported, onRefreshResolved } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notifySuccess = (message: string) => {
    if (showToast) showToast(message, 'success');
  };

  const notifyError = (message: string) => {
    if (showToast) showToast(message, 'error');
  };

  const deleteReview = async (reviewId: string) => {
    setLoading(true);
    setError(null);
    try {
      await adminDeleteReview(reviewId);
      notifySuccess('Review deleted successfully.');
      if (onRefreshReviews) onRefreshReviews();
      if (onRefreshReported) onRefreshReported();
      if (onRefreshResolved) onRefreshResolved();
    } catch (err) {
      console.error('Failed to delete review', err);
      const message = 'Failed to delete review. Please try again.';
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  const sendAdminReply = async (reviewId: string, replyText: string) => {
    const trimmed = replyText.trim();
    if (!trimmed) {
      const message = `Reply cannot be empty. Please enter between ${ADMIN_REPLY_MIN_CHARS} and ${ADMIN_REPLY_MAX_CHARS} characters.`;
      setError(message);
      notifyError(message);
      return;
    }
    if (trimmed.length < ADMIN_REPLY_MIN_CHARS || trimmed.length > ADMIN_REPLY_MAX_CHARS) {
      const message = `Reply must be between ${ADMIN_REPLY_MIN_CHARS} and ${ADMIN_REPLY_MAX_CHARS} characters.`;
      setError(message);
      notifyError(message);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await adminReplyToReview(reviewId, trimmed);
      notifySuccess('Reply sent to review author.');
      if (onRefreshReviews) onRefreshReviews();
    } catch (err) {
      console.error('Failed to send admin reply', err);
      const message = 'Failed to send reply. Please try again.';
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  const resolveReportedReview = async (reportId: string, action: 'complete' | 'delete-review') => {
    setLoading(true);
    setError(null);
    try {
      await adminResolveReviewReport(reportId, action);
      const successMessage =
        action === 'delete-review'
          ? 'Report resolved and review deleted.'
          : 'Report resolved and review kept.';
      notifySuccess(successMessage);
      if (onRefreshReported) onRefreshReported();
      if (onRefreshResolved) onRefreshResolved();
      if (onRefreshReviews) onRefreshReviews();
    } catch (err) {
      console.error('Failed to resolve reported review', err);
      const message = 'Failed to resolve reported review. Please try again.';
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    deleteReview,
    sendAdminReply,
    resolveReportedReview,
  };
}

export default useAdminReviewActions;
