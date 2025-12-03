import React from 'react';
import Modal from '../../../components/ui/Modal';
import type { AdminGameReport } from '../../../services/adminGameReportsService';

interface GameReportModalProps {
  activeGameReport: AdminGameReport | null;
  gameReportModalMode: 'reply' | 'view';
  closeGameReportModal: () => void;
  formatGameIssueType: (report: AdminGameReport) => string;
  formatGameReportReporter: (report: AdminGameReport) => string;
  formatDate: (date: string | Date) => string;
  gameReportReplyMessage: string;
  setGameReportReplyMessage: (message: string) => void;
  gameReportModalError: string | null;
  handleGameReportReplySubmit: () => void;
  gameReportModalSubmitting: boolean;
}

const GameReportModal: React.FC<GameReportModalProps> = ({
  activeGameReport,
  gameReportModalMode,
  closeGameReportModal,
  formatGameIssueType,
  formatGameReportReporter,
  formatDate,
  gameReportReplyMessage,
  setGameReportReplyMessage,
  gameReportModalError,
  handleGameReportReplySubmit,
  gameReportModalSubmitting,
}) => (
  <Modal
    isOpen={!!activeGameReport}
    titleId="game-report-modal-title"
    onClose={closeGameReportModal}
    contentClassName="admin-report-modal__container"
  >
    {activeGameReport && (
      <div className="admin-report-modal">
        <header className="admin-report-modal__header">
          <div>
            <p className="admin-report-modal__eyebrow">
              {gameReportModalMode === 'view' ? 'Game Report Details' : 'Reply to Game Report'}
            </p>
            <h2 id="game-report-modal-title" className="admin-report-modal__title">
              Report {activeGameReport.reportCode}
            </h2>
          </div>
          <button
            type="button"
            className="admin-report-modal__close"
            onClick={closeGameReportModal}
            aria-label="Close"
          >
            A-
          </button>
        </header>

        <section className="admin-report-modal__section" aria-label="Game report details">
          <dl className="admin-report-modal__definition-list">
            <div>
              <dt>Game</dt>
              <dd>{activeGameReport.gameTitle || 'Unknown game'}</dd>
            </div>
            <div>
              <dt>Issue Type</dt>
              <dd>
                <span className="admin-badge admin-badge--issue">
                  {formatGameIssueType(activeGameReport)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Reported By</dt>
              <dd>{formatGameReportReporter(activeGameReport)}</dd>
            </div>
            <div>
              <dt>Report Date</dt>
              <dd>{formatDate(activeGameReport.createdAt)}</dd>
            </div>
            {activeGameReport.resolvedAt && (
              <div>
                <dt>Resolution</dt>
                <dd>
                  {formatDate(activeGameReport.resolvedAt)}
                  {activeGameReport.resolvedByName ? ` A� ${activeGameReport.resolvedByName}` : ''}
                </dd>
              </div>
            )}
          </dl>
          <div className="admin-report-modal__description">
            <h3>Description</h3>
            <p>{activeGameReport.description || 'No description provided.'}</p>
          </div>
        </section>

        {activeGameReport.adminReplies.length > 0 && (
          <section className="admin-report-modal__section" aria-label="Previous admin replies">
            <h3>Previous Admin Reply</h3>
            <div className="admin-report-modal__history-entry">
              <p>{activeGameReport.adminReplies[activeGameReport.adminReplies.length - 1].message}</p>
              <span>
                {activeGameReport.adminReplies[activeGameReport.adminReplies.length - 1].adminName || 'Admin'} A�{' '}
                {formatDate(
                  activeGameReport.adminReplies[activeGameReport.adminReplies.length - 1].createdAt
                )}
              </span>
            </div>
          </section>
        )}

        {gameReportModalMode === 'reply' && (
          <section className="admin-report-modal__section" aria-label="Admin reply">
            <label htmlFor="admin-game-report-reply" className="admin-report-modal__label">
              Admin Reply to Reporter
            </label>
            <textarea
              id="admin-game-report-reply"
              className="admin-report-modal__textarea"
              rows={4}
              value={gameReportReplyMessage}
              onChange={e => setGameReportReplyMessage(e.target.value)}
              placeholder="Type your reply to the reporter..."
            />
          </section>
        )}

        {gameReportModalError && (
          <p className="admin-report-modal__error" role="alert">
            {gameReportModalError}
          </p>
        )}

        <div className="admin-report-modal__actions">
          <button type="button" className="admin-report-modal__secondary" onClick={closeGameReportModal}>
            Cancel
          </button>
          {gameReportModalMode === 'reply' ? (
            <button
              type="button"
              className="admin-report-modal__primary"
              onClick={handleGameReportReplySubmit}
              disabled={gameReportModalSubmitting}
            >
              {gameReportModalSubmitting ? 'Sending...' : 'Send Reply & Resolve'}
            </button>
          ) : (
            <button type="button" className="admin-report-modal__primary" onClick={closeGameReportModal}>
              Close
            </button>
          )}
        </div>
      </div>
    )}
  </Modal>
);

export default GameReportModal;
