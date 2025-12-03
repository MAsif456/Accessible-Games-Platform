import React from 'react';
import Modal from '../../../components/ui/Modal';
import type { AdminResolvedReviewReport } from '../../../services/adminReviewsService';

interface ViewResolvedReportModalProps {
  resolvedReportToView: AdminResolvedReviewReport | null;
  setResolvedReportToView: (report: AdminResolvedReviewReport | null) => void;
}

const ViewResolvedReportModal: React.FC<ViewResolvedReportModalProps> = ({
  resolvedReportToView,
  setResolvedReportToView,
}) => (
  <Modal
    isOpen={!!resolvedReportToView}
    titleId="view-resolved-report-title"
    onClose={() => setResolvedReportToView(null)}
    contentClassName="modal-content--wide"
  >
    {resolvedReportToView && (
      <div>
        <h2 id="view-resolved-report-title" className="dialog__title">
          View Resolved Report
        </h2>
        <div className="report-modal__sections">
          <div className="report-modal__section">
            <h3>Report Information</h3>
            <p><strong>Report ID:</strong> {resolvedReportToView._id}</p>
            <p><strong>Reason:</strong> {resolvedReportToView.reportReason}</p>
            <p><strong>Reported Date:</strong> {new Date(resolvedReportToView.createdAt).toLocaleDateString()}</p>
            <p><strong>Outcome:</strong> {resolvedReportToView.outcome === 'deleted' ? 'Review deleted' : 'Review kept'}</p>
          </div>
          <div className="report-modal__section">
            <h3>Review Content</h3>
            <p><strong>Review ID:</strong> {resolvedReportToView.reviewPublicId ?? resolvedReportToView.reviewId}</p>
            <p><strong>Game:</strong> {resolvedReportToView.gameTitle ?? resolvedReportToView.gameSlug ?? ''}</p>
            <p><strong>Author:</strong> {resolvedReportToView.reviewAuthorName ?? ''}</p>
            <p><strong>Text:</strong> {resolvedReportToView.reportReason ?? 'No content available'}</p>
            <p><strong>Admin Reply:</strong> {resolvedReportToView.adminReply?.trim() || 'No admin reply recorded'}</p>
          </div>
        </div>
        <div className="dialog__actions">
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={() => setResolvedReportToView(null)}
          >
            Close
          </button>
        </div>
      </div>
    )}
  </Modal>
);

export default ViewResolvedReportModal;
