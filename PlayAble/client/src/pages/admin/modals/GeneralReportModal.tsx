import React from 'react';
import Modal from '../../../components/ui/Modal';
import { formatReportCode, type AdminGeneralReport } from '../../../services/adminReportsService';

interface GeneralReportModalProps {
  activeReport: AdminGeneralReport | null;
  reportModalMode: 'reply' | 'view';
  closeReportModal: () => void;
  formatReporter: (report: AdminGeneralReport) => string;
  formatDate: (date: string | Date) => string;
  reportReplyMessage: string;
  setReportReplyMessage: (message: string) => void;
  reportModalError: string | null;
  handleReportReplySubmit: () => void;
  reportModalSubmitting: boolean;
}

const GeneralReportModal: React.FC<GeneralReportModalProps> = ({
  activeReport,
  reportModalMode,
  closeReportModal,
  formatReporter,
  formatDate,
  reportReplyMessage,
  setReportReplyMessage,
  reportModalError,
  handleReportReplySubmit,
  reportModalSubmitting,
}) => (
  <Modal
    isOpen={!!activeReport}
    titleId="general-report-modal-title"
    onClose={closeReportModal}
    contentClassName="admin-report-modal__container"
  >
    {activeReport && (
      <div className="admin-report-modal">
        <header className="admin-report-modal__header">
          <div>
            <p className="admin-report-modal__eyebrow">
              {reportModalMode === 'view' ? 'General Report Details' : 'Reply to General Report'}
            </p>
            <h2 id="general-report-modal-title" className="admin-report-modal__title">
              Report {formatReportCode(activeReport)}
            </h2>
          </div>
          <button type="button" className="admin-report-modal__close" onClick={closeReportModal} aria-label="Close">
            A-
          </button>
        </header>

        <section className="admin-report-modal__section" aria-label="Report details">
          <dl className="admin-report-modal__definition-list">
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  className={
                    'admin-badge ' +
                    (activeReport.status === 'resolved' ? 'admin-badge--status' : 'admin-badge--issue')
                  }
                >
                  {activeReport.status === 'resolved' ? 'Resolved' : 'Open'}
                </span>
              </dd>
            </div>
            <div>
              <dt>Reported By</dt>
              <dd>{formatReporter(activeReport)}</dd>
            </div>
            <div>
              <dt>Report Date</dt>
              <dd>{formatDate(activeReport.createdAt)}</dd>
            </div>
            {activeReport.resolvedAt && (
              <div>
                <dt>Resolution Date</dt>
                <dd>{formatDate(activeReport.resolvedAt)}</dd>
              </div>
            )}
          </dl>
          <div className="admin-report-modal__description">
            <h3>Description</h3>
            <p>{activeReport.description || 'No description provided.'}</p>
          </div>
        </section>

        {activeReport.adminReplies.length > 0 && (
          <section className="admin-report-modal__section" aria-label="Previous admin replies">
            <h3>Previous Admin Reply</h3>
            <div className="admin-report-modal__history-entry">
              <p>{activeReport.adminReplies[activeReport.adminReplies.length - 1].message}</p>
              <span>
                {activeReport.adminReplies[activeReport.adminReplies.length - 1].adminName || 'Admin'} A�{' '}
                {formatDate(
                  activeReport.adminReplies[activeReport.adminReplies.length - 1].createdAt
                )}
              </span>
            </div>
          </section>
        )}

        {reportModalMode === 'reply' && (
          <section className="admin-report-modal__section" aria-label="Admin reply">
            <label htmlFor="admin-report-reply" className="admin-report-modal__label">
              Admin Reply to Reporter
            </label>
            <textarea
              id="admin-report-reply"
              className="admin-report-modal__textarea"
              rows={4}
              value={reportReplyMessage}
              onChange={e => setReportReplyMessage(e.target.value)}
              placeholder="Type your reply to the reporter..."
            />
          </section>
        )}

        {reportModalError && (
          <p className="admin-report-modal__error" role="alert">
            {reportModalError}
          </p>
        )}

        <div className="admin-report-modal__actions">
          <button type="button" className="admin-report-modal__secondary" onClick={closeReportModal}>
            Cancel
          </button>
          {reportModalMode === 'reply' ? (
            <button
              type="button"
              className="admin-report-modal__primary"
              onClick={handleReportReplySubmit}
              disabled={reportModalSubmitting}
            >
              {reportModalSubmitting ? 'Sending...' : 'Send Reply & Resolve'}
            </button>
          ) : (
            <button type="button" className="admin-report-modal__primary" onClick={closeReportModal}>
              Close
            </button>
          )}
        </div>
      </div>
    )}
  </Modal>
);

export default GeneralReportModal;
