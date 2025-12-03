import React from 'react';
import Modal from '../../../components/ui/Modal';

export interface ResolveConfirmAction {
  action: 'complete' | 'delete-review';
  report: any;
}

interface ConfirmResolveModalProps {
  resolveConfirmAction: ResolveConfirmAction | null;
  setResolveConfirmAction: (action: ResolveConfirmAction | null) => void;
  moderatorReply: string;
  sendAdminReply: (reviewId: string, message: string) => Promise<void>;
  resolveReportedReview: (reportId: string, action: 'complete' | 'delete-review') => Promise<void>;
  setReportToResolve: (report: any) => void;
  setModeratorReply: (reply: string) => void;
}

const ConfirmResolveModal: React.FC<ConfirmResolveModalProps> = ({
  resolveConfirmAction,
  setResolveConfirmAction,
  moderatorReply,
  sendAdminReply,
  resolveReportedReview,
  setReportToResolve,
  setModeratorReply,
}) => (
  <Modal
    isOpen={!!resolveConfirmAction}
    titleId="confirm-resolve-title"
    onClose={() => setResolveConfirmAction(null)}
    contentClassName="modal-content--wide"
  >
    {resolveConfirmAction && (
      <div>
        <h2 id="confirm-resolve-title" className="dialog__title">
          {resolveConfirmAction.action === 'complete' ? 'Complete Report' : 'Delete Review'}
        </h2>
        <p className="dialog__message">
          {resolveConfirmAction.action === 'complete'
            ? 'Are you sure you want to complete this report and keep the review live?'
            : 'Are you sure you want to delete this review as part of resolving the report?'}
        </p>
        <div className="dialog__actions dialog__actions--split">
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={() => setResolveConfirmAction(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={
              resolveConfirmAction.action === 'complete'
                ? 'dialog__button dialog__button--contrast'
                : 'dialog__button dialog__button--primary'
            }
            onClick={async () => {
              const targetReport = resolveConfirmAction.report;
              const action = resolveConfirmAction.action;
              if (moderatorReply.trim()) {
                await sendAdminReply(targetReport.reviewId, moderatorReply.trim());
              }
              await resolveReportedReview(targetReport._id, action);
              setResolveConfirmAction(null);
              setReportToResolve(null);
              setModeratorReply('');
            }}
          >
            {resolveConfirmAction.action === 'complete' ? 'Complete' : 'Delete Review'}
          </button>
        </div>
      </div>
    )}
  </Modal>
);

export default ConfirmResolveModal;
