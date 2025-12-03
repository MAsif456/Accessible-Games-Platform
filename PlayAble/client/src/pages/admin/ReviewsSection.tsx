import React from 'react';
import Pagination from '../../components/ui/Pagination';
import type { AdminResolvedReviewReport } from '../../services/adminReviewsService';
import ConfirmResolveModal, { type ResolveConfirmAction } from './modals/ConfirmResolveModal';
import DeleteReviewModal from './modals/DeleteReviewModal';
import ReplyReviewModal from './modals/ReplyReviewModal';
import ResolveReviewModal from './modals/ResolveReviewModal';
import ViewResolvedReportModal from './modals/ViewResolvedReportModal';

type ReviewsSubTab = 'reviews' | 'reported' | 'resolved';

interface ReviewsSectionProps {
  reviewsSubTab: ReviewsSubTab;
  reviewsTable: any;
  reportedTable: any;
  resolvedTable: any;
  setReviewToReply: (review: any) => void;
  setReviewToDelete: (review: { id: string; displayId?: string; authorName?: string } | null) => void;
  reviewToDelete: { id: string; displayId?: string; authorName?: string } | null;
  reviewToReply: any;
  replyText: string;
  setReplyText: (value: string) => void;
  replyError: string | null;
  setReplyError: (value: string | null) => void;
  adminActionsError: string | null;
  sendAdminReply: (reviewId: string, message: string) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  reportToResolve: any;
  setReportToResolve: (report: any) => void;
  moderatorReply: string;
  setModeratorReply: (value: string) => void;
  moderatorReplyError: string | null;
  setModeratorReplyError: (value: string | null) => void;
  resolveConfirmAction: ResolveConfirmAction | null;
  setResolveConfirmAction: (action: ResolveConfirmAction | null) => void;
  resolvedReportToView: AdminResolvedReviewReport | null;
  setResolvedReportToView: (report: AdminResolvedReviewReport | null) => void;
  resolveReportedReview: (reportId: string, action: 'complete' | 'delete-review') => Promise<void>;
  formatDate: (date: string | Date) => string;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviewsSubTab,
  reviewsTable,
  reportedTable,
  resolvedTable,
  setReviewToReply,
  setReviewToDelete,
  reviewToDelete,
  reviewToReply,
  replyText,
  setReplyText,
  replyError,
  setReplyError,
  adminActionsError,
  sendAdminReply,
  deleteReview,
  reportToResolve,
  setReportToResolve,
  moderatorReply,
  setModeratorReply,
  moderatorReplyError,
  setModeratorReplyError,
  resolveConfirmAction,
  setResolveConfirmAction,
  resolvedReportToView,
  setResolvedReportToView,
  resolveReportedReview,
  formatDate,
}) => {
  const confirmResolveModal = (
    <ConfirmResolveModal
      resolveConfirmAction={resolveConfirmAction}
      setResolveConfirmAction={setResolveConfirmAction}
      moderatorReply={moderatorReply}
      sendAdminReply={sendAdminReply}
      resolveReportedReview={resolveReportedReview}
      setReportToResolve={setReportToResolve}
      setModeratorReply={setModeratorReply}
    />
  );

  if (reviewsSubTab === 'reviews') {
    const totalPages = Math.max(1, Math.ceil(reviewsTable.total / reviewsTable.pageSize));
    return (
      <section className="admin-section-card" aria-labelledby="reviews-title">
        <header className="admin-section-card__header">
          <div>
            <h2 id="reviews-title">Reviews Management</h2>
            <p className="admin-section-card__description">
              Moderate and manage user-submitted accessibility reviews.
            </p>
          </div>
        </header>

        <div className="admin-section-card__search-wrapper">
          <div className="admin-section-card__search-input-wrapper">
            <input
              type="search"
              className="admin-section-card__search-input"
              value={reviewsTable.searchTerm}
              onChange={e => reviewsTable.setSearchTerm(e.target.value)}
              placeholder="Search reviews by ID, game, author, or comment"
            />
            {reviewsTable.searchTerm && (
              <button
                type="button"
                className="browse-page__search-clear navbar__search-clear--full"
                onClick={() => reviewsTable.setSearchTerm('')}
              >
                <span className="browse-page__search-clear-icon" aria-hidden="true">
                  A-
                </span>
                <span className="browse-page__search-clear-label">Clear</span>
              </button>
            )}
          </div>
        </div>

        {reviewsTable.error && (
          <div role="alert" className="admin-error-message">
            {reviewsTable.error}
          </div>
        )}

        <div className="admin-table-wrapper">
          <table className="admin-table" aria-label="Reviews management table">
            <caption className="sr-only">User-submitted accessibility reviews</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Game</th>
                <th scope="col">Author</th>
                <th scope="col">Comment</th>
                <th scope="col">Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviewsTable.loading ? (
                <tr className="admin-table__empty-row">
                  <td colSpan={6}>
                    <p className="admin-table__empty-message">Loading reviews...</p>
                  </td>
                </tr>
              ) : reviewsTable.items.length === 0 ? (
                <tr className="admin-table__empty-row">
                  <td colSpan={6}>
                    <p className="admin-table__empty-message">No reviews</p>
                  </td>
                </tr>
              ) : (
                reviewsTable.items.map((review: any) => (
                  <tr key={review._id}>
                    <td>{review.publicId ?? review._id}</td>
                    <td>{review.gameTitle ?? review.gameSlug ?? review.gameId}</td>
                    <td>{review.authorName}</td>
                    <td>
                      <span>{review.body.length > 80 ? `${review.body.slice(0, 80)}�?�` : review.body}</span>
                      {/* Placeholder for future voice badge */}
                    </td>
                    <td>{new Date(review.createdAt).toLocaleDateString()}</td>
                    <td className="admin-table__actions-cell admin-table__actions-cell--split">
                      <button
                        type="button"
                        className="admin-table__action-button"
                        onClick={() => setReviewToReply(review)}
                      >
                        Manage
                      </button>
                      <div className="admin-table__actions-spacer" aria-hidden="true" />
                      <button
                        type="button"
                        className="admin-table__action-button admin-table__action-button--secondary"
                        onClick={() =>
                          setReviewToDelete({
                            id: review._id,
                            displayId: review.publicId ?? review._id,
                            authorName: review.authorName,
                          })
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {reviewsTable.total > reviewsTable.pageSize && (
          <div className="admin-pagination">
            <Pagination
              page={reviewsTable.page}
              totalPages={totalPages}
              onPageChange={reviewsTable.setPage}
              ariaLabel="Reviews pagination"
            />
          </div>
        )}

        <DeleteReviewModal
          reviewToDelete={reviewToDelete}
          setReviewToDelete={setReviewToDelete}
          deleteReview={deleteReview}
        />
        <ReplyReviewModal
          reviewToReply={reviewToReply}
          setReviewToReply={setReviewToReply}
          replyText={replyText}
          setReplyText={setReplyText}
          replyError={replyError}
          setReplyError={setReplyError}
          adminActionsError={adminActionsError}
          sendAdminReply={sendAdminReply}
        />
        {confirmResolveModal}
      </section>
    );
  }

  if (reviewsSubTab === 'reported') {
    const totalPages = Math.max(1, Math.ceil(reportedTable.total / reportedTable.pageSize));
    return (
      <section className="admin-section-card" aria-labelledby="reported-reviews-title">
        <header className="admin-section-card__header">
          <div>
            <h2 id="reported-reviews-title">Reported Reviews</h2>
            <p className="admin-section-card__description">
              Reviews that have been reported by users and require moderation.
            </p>
          </div>
        </header>

        <div className="admin-section-card__search-wrapper">
          <div className="admin-section-card__search-input-wrapper">
            <input
              type="search"
              className="admin-section-card__search-input"
              value={reportedTable.searchTerm}
              onChange={e => reportedTable.setSearchTerm(e.target.value)}
              placeholder="Search reported reviews by ID, game, author, or reason"
            />
            {reportedTable.searchTerm && (
              <button
                type="button"
                className="browse-page__search-clear navbar__search-clear--full"
                onClick={() => reportedTable.setSearchTerm('')}
              >
                <span className="browse-page__search-clear-icon" aria-hidden="true">
                  A-
                </span>
                <span className="browse-page__search-clear-label">Clear</span>
              </button>
            )}
          </div>
        </div>

        {reportedTable.error && (
          <div role="alert" className="admin-error-message">
            {reportedTable.error}
          </div>
        )}

        <div className="admin-table-wrapper">
          <table className="admin-table" aria-label="Reported reviews table">
            <caption className="sr-only">Reported reviews requiring moderation</caption>
            <thead>
              <tr>
                <th scope="col">Report ID</th>
                <th scope="col">Game</th>
                <th scope="col">Review Author</th>
                <th scope="col">Report Reason</th>
                <th scope="col">Reported Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reportedTable.loading ? (
                <tr className="admin-table__empty-row">
                  <td colSpan={6}>
                    <p className="admin-table__empty-message">Loading reported reviews...</p>
                  </td>
                </tr>
              ) : reportedTable.items.length === 0 ? (
                <tr className="admin-table__empty-row">
                  <td colSpan={6}>
                    <p className="admin-table__empty-message">No reported reviews</p>
                  </td>
                </tr>
              ) : (
                reportedTable.items.map((report: any) => (
                  <tr key={report._id}>
                    <td>{report._id}</td>
                    <td>{report.gameTitle ?? report.gameSlug ?? report.reviewPublicId ?? report.reviewId}</td>
                    <td>{report.reviewAuthorName ?? ''}</td>
                    <td>{report.reportReason}</td>
                    <td>{formatDate(report.createdAt)}</td>
                    <td className="admin-table__actions-cell">
                      <button
                        type="button"
                        className="admin-table__action-button admin-table__action-button--secondary"
                        onClick={() => {
                          setReportToResolve(report);
                          setModeratorReply('');
                          setModeratorReplyError(null);
                        }}
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {reportedTable.total > reportedTable.pageSize && (
          <div className="admin-pagination">
            <Pagination
              page={reportedTable.page}
              totalPages={totalPages}
              onPageChange={reportedTable.setPage}
              ariaLabel="Reported reviews pagination"
            />
          </div>
        )}

        <ResolveReviewModal
          reportToResolve={reportToResolve}
          setReportToResolve={setReportToResolve}
          moderatorReply={moderatorReply}
          setModeratorReply={setModeratorReply}
          moderatorReplyError={moderatorReplyError}
          setModeratorReplyError={setModeratorReplyError}
          adminActionsError={adminActionsError}
          setResolveConfirmAction={setResolveConfirmAction}
        />
        {confirmResolveModal}
      </section>
    );
  }

  const totalPages = Math.max(1, Math.ceil(resolvedTable.total / resolvedTable.pageSize));
  return (
    <section className="admin-section-card" aria-labelledby="resolved-reviews-title">
      <header className="admin-section-card__header">
        <div>
          <h2 id="resolved-reviews-title">Resolved Reported Reviews</h2>
          <p className="admin-section-card__description">
            Resolved reports for reviews that have been addressed by administrators.
          </p>
        </div>
      </header>

      <div className="admin-section-card__search-wrapper">
        <label htmlFor="resolved-reviews-search" className="sr-only">
          Search resolved reported reviews
        </label>
        <div className="admin-section-card__search-input-wrapper">
          <input
            id="resolved-reviews-search"
            type="search"
            className="admin-section-card__search-input"
            placeholder="Search by game, author, or reason..."
            value={resolvedTable.searchTerm}
            onChange={e => resolvedTable.setSearchTerm(e.target.value)}
          />
          {resolvedTable.searchTerm && (
            <button
              type="button"
              className="browse-page__search-clear navbar__search-clear--full"
              onClick={() => resolvedTable.setSearchTerm('')}
            >
              <span className="browse-page__search-clear-icon" aria-hidden="true">
                A-
              </span>
              <span className="browse-page__search-clear-label">Clear</span>
            </button>
          )}
        </div>
      </div>

      {resolvedTable.error && (
        <div role="alert" className="admin-error-message">
          {resolvedTable.error}
        </div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table" aria-label="Resolved reported reviews table">
          <caption className="sr-only">Resolved reports for previously reported reviews</caption>
          <thead>
            <tr>
              <th scope="col">Report ID</th>
              <th scope="col">Game</th>
              <th scope="col">Review Author</th>
              <th scope="col">Report Reason</th>
              <th scope="col">Reported Date</th>
              <th scope="col">Outcome</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resolvedTable.loading ? (
              <tr className="admin-table__empty-row">
                <td colSpan={7}>
                  <p className="admin-table__empty-message">Loading resolved reported reviews...</p>
                </td>
              </tr>
            ) : resolvedTable.items.length === 0 ? (
              <tr className="admin-table__empty-row">
                <td colSpan={7}>
                  <p className="admin-table__empty-message">No resolved reported reviews</p>
                </td>
              </tr>
            ) : (
              resolvedTable.items.map((report: any) => {
                const reason = report.reportReason || '';
                return (
                  <tr key={report._id}>
                    <td>{report._id}</td>
                    <td>{report.gameTitle ?? report.gameSlug ?? report.reviewPublicId ?? report.reviewId}</td>
                    <td>{report.reviewAuthorName ?? ''}</td>
                    <td title={reason}>
                      {reason.length > 60 ? `${reason.slice(0, 60)}�?�` : reason}
                    </td>
                    <td>{formatDate(report.createdAt)}</td>
                    <td>{report.outcome === 'deleted' ? 'Review deleted' : 'Review kept'}</td>
                    <td className="admin-table__actions-cell admin-table__actions-cell--split">
                      <button
                        type="button"
                        className="admin-table__action-button"
                        onClick={() => setResolvedReportToView(report)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {resolvedTable.total > resolvedTable.pageSize && (
        <div className="admin-pagination">
          <Pagination
            page={resolvedTable.page}
            totalPages={totalPages}
            onPageChange={resolvedTable.setPage}
            ariaLabel="Resolved reported reviews pagination"
          />
        </div>
      )}

      <ViewResolvedReportModal
        resolvedReportToView={resolvedReportToView}
        setResolvedReportToView={setResolvedReportToView}
      />
    </section>
  );
};

export default ReviewsSection;
