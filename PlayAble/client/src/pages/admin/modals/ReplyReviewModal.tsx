import React from 'react';
import Modal from '../../../components/ui/Modal';
import { ADMIN_REPLY_MIN_CHARS, ADMIN_REPLY_MAX_CHARS } from '../../../hooks/useAdminReviewActions';

interface ReplyReviewModalProps {
  reviewToReply: any;
  setReviewToReply: (review: any) => void;
  replyText: string;
  setReplyText: (value: string) => void;
  replyError: string | null;
  setReplyError: (value: string | null) => void;
  adminActionsError: string | null;
  sendAdminReply: (reviewId: string, message: string) => Promise<void>;
}

const ReplyReviewModal: React.FC<ReplyReviewModalProps> = ({
  reviewToReply,
  setReviewToReply,
  replyText,
  setReplyText,
  replyError,
  setReplyError,
  adminActionsError,
  sendAdminReply,
}) => (
  <Modal
    isOpen={!!reviewToReply}
    titleId="reply-review-title"
    onClose={() => {
      setReviewToReply(null);
      setReplyText('');
      setReplyError(null);
    }}
    contentClassName="modal-content--wide"
  >
    {reviewToReply && (
      <div>
        <h2 id="reply-review-title" className="dialog__title">
          Reply to Review
        </h2>
        <div className="dialog__message">
          <p><strong>Review ID:</strong> {reviewToReply.publicId ?? reviewToReply._id}</p>
          <p><strong>Game:</strong> {reviewToReply.gameTitle ?? reviewToReply.gameSlug ?? reviewToReply.gameId}</p>
          <p><strong>Author:</strong> {reviewToReply.authorName}</p>
          <p><strong>Date:</strong> {new Date(reviewToReply.createdAt).toLocaleDateString()}</p>
          <p><strong>Comment:</strong> {reviewToReply.body}</p>
        </div>
        <label className="form-label" htmlFor="admin-reply-text">
          Admin Reply to Author
        </label>
        <textarea
          id="admin-reply-text"
          className="profile-textarea"
          value={replyText}
          onChange={e => {
            const value = e.target.value;
            setReplyText(value);
            const trimmed = value.trim();
            if (!trimmed) {
              setReplyError(null);
            } else if (trimmed.length < ADMIN_REPLY_MIN_CHARS || trimmed.length > ADMIN_REPLY_MAX_CHARS) {
              setReplyError(`Reply must be between ${ADMIN_REPLY_MIN_CHARS} and ${ADMIN_REPLY_MAX_CHARS} characters.`);
            } else {
              setReplyError(null);
            }
          }}
        />
        {replyError && (
          <p className="admin-form-field-error" role="alert">
            {replyError}
          </p>
        )}
        {adminActionsError && !replyError && (
          <p className="admin-form-field-error" role="alert">
            {adminActionsError}
          </p>
        )}
        <div className="dialog__actions">
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={() => {
              setReviewToReply(null);
              setReplyText('');
              setReplyError(null);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dialog__button dialog__button--primary"
            disabled={!replyText.trim() || !!replyError}
            onClick={async () => {
              const trimmed = replyText.trim();
              if (!trimmed || replyError) {
                return;
              }
              await sendAdminReply(reviewToReply._id, trimmed);
              setReviewToReply(null);
              setReplyText('');
              setReplyError(null);
            }}
          >
            Send Reply
          </button>
        </div>
      </div>
    )}
  </Modal>
);

export default ReplyReviewModal;
