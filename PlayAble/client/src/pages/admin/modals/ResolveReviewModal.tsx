import React from 'react';
import Modal from '../../../components/ui/Modal';
import { ADMIN_REPLY_MIN_CHARS, ADMIN_REPLY_MAX_CHARS } from '../../../hooks/useAdminReviewActions';
import type { ResolveConfirmAction } from './ConfirmResolveModal';

interface ResolveReviewModalProps {
  reportToResolve: any;
  setReportToResolve: (report: any) => void;
  moderatorReply: string;
  setModeratorReply: (value: string) => void;
  moderatorReplyError: string | null;
  setModeratorReplyError: (value: string | null) => void;
  adminActionsError: string | null;
  setResolveConfirmAction: (action: ResolveConfirmAction | null) => void;
}

const ResolveReviewModal: React.FC<ResolveReviewModalProps> = ({
  reportToResolve,
  setReportToResolve,
  moderatorReply,
  setModeratorReply,
  moderatorReplyError,
  setModeratorReplyError,
  adminActionsError,
  setResolveConfirmAction,
}) => (
  <Modal
    isOpen={!!reportToResolve}
    titleId="resolve-report-title"
    onClose={() => {
      setReportToResolve(null);
      setModeratorReply('');
      setModeratorReplyError(null);
    }}
    contentClassName="modal-content--wide"
  >
    {reportToResolve && (
      <div>
        <h2 id="resolve-report-title" className="dialog__title">
          Resolve Reported Review
        </h2>
        <div className="report-modal__sections">
          <div className="report-modal__section">
            <h3>Report Information</h3>
            <p><strong>Report ID:</strong> {reportToResolve._id}</p>
            <p><strong>Reason:</strong> {reportToResolve.reportReason}</p>
            <p><strong>Reported By:</strong> {reportToResolve.reporterEmail ?? 'Unknown'}</p>
            <p><strong>Reported Date:</strong> {new Date(reportToResolve.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="report-modal__section">
            <h3>Review Content</h3>
            <p><strong>Review ID:</strong> {reportToResolve.reviewPublicId ?? reportToResolve.reviewId}</p>
            <p><strong>Game:</strong> {reportToResolve.gameTitle ?? reportToResolve.gameSlug ?? ''}</p>
            <p><strong>Author:</strong> {reportToResolve.reviewAuthorName ?? ''}</p>
            <p><strong>Text:</strong> {reportToResolve.reviewBody ?? 'No content available'}</p>
          </div>
          <div className="report-modal__section">
            <h3>Admin Reply to Author (optional)</h3>
            <textarea
              className="report-modal__textarea"
              placeholder="Explain the decision to the reviewer..."
              value={moderatorReply}
              onChange={e => {
                const value = e.target.value;
                setModeratorReply(value);
                const trimmed = value.trim();
                if (!trimmed) {
                  setModeratorReplyError(null);
                } else if (trimmed.length < ADMIN_REPLY_MIN_CHARS || trimmed.length > ADMIN_REPLY_MAX_CHARS) {
                  setModeratorReplyError(`Reply must be between ${ADMIN_REPLY_MIN_CHARS} and ${ADMIN_REPLY_MAX_CHARS} characters.`);
                } else {
                  setModeratorReplyError(null);
                }
              }}
            />
            {moderatorReplyError && (
              <p className="admin-form-field-error" role="alert">
                {moderatorReplyError}
              </p>
            )}
            {adminActionsError && !moderatorReplyError && (
              <p className="admin-form-field-error" role="alert">
                {adminActionsError}
              </p>
            )}
            <p className="admin-form-field-hint">
              Any reply entered here will be sent when you choose Complete or Delete Review.
            </p>
          </div>
        </div>
        <div className="dialog__actions dialog__actions--split">
          <div className="dialog__actions-group">
            <button
              type="button"
              className="dialog__button dialog__button--secondary"
              onClick={() => {
                setReportToResolve(null);
                setModeratorReply('');
                setModeratorReplyError(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="dialog__button dialog__button--contrast"
              disabled={!!moderatorReplyError}
              onClick={() => setResolveConfirmAction({ action: 'complete', report: reportToResolve })}
            >
              Complete
            </button>
          </div>
          <button
            type="button"
            className="dialog__button dialog__button--primary"
            disabled={!!moderatorReplyError}
            onClick={() => setResolveConfirmAction({ action: 'delete-review', report: reportToResolve })}
          >
            Delete Review
          </button>
        </div>
      </div>
    )}
  </Modal>
);

export default ResolveReviewModal;
