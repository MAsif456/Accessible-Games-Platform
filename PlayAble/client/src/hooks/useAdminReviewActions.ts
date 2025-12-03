import { useState } from 'react';
import { adminDeleteReview, adminReplyToReview, adminResolveReviewReport } from '../services/adminReviewsService';

/**
 * Options for admin review action hook.
 */
export interface UseAdminReviewActionsOptions {
  showToast?: (message: string, type?: 'success' | 'error') => void;
  onRefreshReviews?: () => void;
  onRefreshReported?: () => void;
  onRefreshResolved?: () => void;
  onRefreshStats?: () => void;
}

export const ADMIN_REPLY_MIN_CHARS = 10;
export const ADMIN_REPLY_MAX_CHARS = 1000;

/**
 * Hook to provide admin review actions.
 *
 * @param {UseAdminReviewActionsOptions} options - Options for the hook.
 * @param {UseAdminReviewActionsOptions.showToast} options.showToast - A function to show a toast message.
 * @param {UseAdminReviewActionsOptions.onRefreshReviews} options.onRefreshReviews - A callback to refresh the reviews table.
 * @param {UseAdminReviewActionsOptions.onRefreshReported} options.onRefreshReported - A callback to refresh the reported reviews table.
 * @param {UseAdminReviewActionsOptions.onRefreshResolved} options.onRefreshResolved - A callback to refresh the resolved reported reviews table.
 *
 * @returns {Object} - An object containing the admin review actions.
 *
 * @example
 * const { loading, error, deleteReview, sendAdminReply, resolveReportedReview } = useAdminReviewActions({
 *   showToast: (message, type) => console.log(`${type}: ${message}`),
 *   onRefreshReviews: () => console.log('Refreshing reviews table...'),
 *   onRefreshReported: () => console.log('Refreshing reported reviews table...'),
 *   onRefreshResolved: () => console.log('Refreshing resolved reported reviews table...'),
 * });
*/
export function useAdminReviewActions(options: UseAdminReviewActionsOptions = {}) {
  const { showToast, onRefreshReviews, onRefreshReported, onRefreshResolved, onRefreshStats } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

/**
 * Notify the user of a successful operation.
 *
 * @param {string} message - The message to display to the user.
 */
  const notifySuccess = (message: string) => {
    if (showToast) showToast(message, 'success');
  };

/**
 * Notify the user of an error operation.
 *
 * @param {string} message - The message to display to the user.
 */
  const notifyError = (message: string) => {
    if (showToast) showToast(message, 'error');
  };

/**
 * Delete a review.
 *
 * @param {string} reviewId - The ID of the review to delete.
 *
 * @throws {Error} - If the review deletion fails.
 */

  const deleteReview = async (reviewId: string) => {
    setLoading(true);
    setError(null);
    try {
      await adminDeleteReview(reviewId);
      notifySuccess('Review deleted successfully.');
      if (onRefreshReviews) onRefreshReviews();
      if (onRefreshReported) onRefreshReported();
      if (onRefreshResolved) onRefreshResolved();
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Failed to delete review', err);
      const message = 'Failed to delete review. Please try again.';
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

/**
 * Send an admin reply to a review.
 *
 * @param {string} reviewId - The ID of the review to reply to.
 * @param {string} replyText - The text of the admin reply.
 *
 * @throws {Error} - If the admin reply fails to send.
 */

  const sendAdminReply = async (reviewId: string, replyText: string) => {
    // Validate reply locally to avoid avoidable API calls.
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
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Failed to send admin reply', err);
      const message = 'Failed to send reply. Please try again.';
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

/**
 * Resolve a reported review, optionally deleting the review.
 *
 * @param {string} reportId - The ID of the reported review to resolve.
 * @param {'complete' | 'delete-review'} action - The action to take when resolving the reported review.
 *   - 'complete': Resolve the review and keep the review.
 *   - 'delete-review': Resolve the review and delete the review.
 *
 * @throws {Error} - If resolving the reported review fails.
 */

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
      if (onRefreshStats) onRefreshStats();
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
