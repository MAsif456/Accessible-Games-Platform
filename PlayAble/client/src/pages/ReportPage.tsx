import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReportForm from '../components/report/ReportForm';
import { useGameReportDetails, useReviewReportDetails } from '../hooks/useReportDetails';
import type { ReportType } from '../services/reportApi';

interface RouteParams {
  reportType?: ReportType;
  gameId?: string;
  reviewId?: string;
}

const REPORT_CONFIG: Record<ReportType, { pageTitle: string; bannerText: string }> = {
  general: {
    pageTitle: 'Report an Issue',
    bannerText:
      'Your report will be sent directly to our admin team for review. We take all accessibility concerns seriously and work with developers to address them.',
  },
  game: {
    pageTitle: 'Report a Game Issue',
    bannerText:
      'Your report will be sent directly to our admin team for review. We take all accessibility concerns seriously and work with developers to address them.',
  },
  review: {
    pageTitle: 'Report a Review',
    bannerText:
      'Your report will be sent directly to our moderation team for review. We take all community guideline violations seriously and will investigate this review promptly.',
  },
};

const ReportPage: React.FC<{ onShowToast?: (message: string, type?: 'success' | 'error') => void }> = ({
  onShowToast,
}) => {
  // useParams without generic to satisfy router typings
  const rawParams = useParams();
  const params = rawParams as RouteParams;

  const reportType: ReportType = (params.reportType as ReportType) || 'general';
  const { gameId, reviewId } = params;

  const isGame = reportType === 'game';
  const isReview = reportType === 'review';

  const gameDetails = useGameReportDetails(isGame ? gameId : undefined);
  const reviewDetails = useReviewReportDetails(isReview ? reviewId : undefined);

  // Scroll to top when this page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const config = REPORT_CONFIG[reportType];

  const handleReportSubmitted = () => {
    if (onShowToast) {
      onShowToast('Your report has been submitted.', 'success');
    }
  };

  return (
    <main className="report-page" aria-label={config.pageTitle}>
      <nav className="report-page__breadcrumb" aria-label="Breadcrumb">
        <button
          type="button"
          className="report-page__breadcrumb-link"
          onClick={() => window.history.back()}
        >
          Home
        </button>
        <span className="report-page__breadcrumb-separator" aria-hidden="true">
          /
        </span>
        <span className="report-page__breadcrumb-current">{config.pageTitle}</span>
      </nav>

      <header className="report-page__header">
        <h1 className="report-page__title">{config.pageTitle}</h1>
      </header>

      {/* Single full-width white card layout, without blue banner */}
      <section className="report-page__card" aria-label="Reporting information and form">
        <div className="report-page__card-header">
          {/* Context blocks now live directly at the top of the card, above the form */}
          <div className="report-page__context">
            {reportType === 'general' && (
              <div>
                <h2 className="report-page__context-title">Report Context</h2>
                <p>
                  Complete one of, or both sections bellow to tell us about any general queries. The more detail you can provide, the
                  better we can help.
                </p>
              </div>
            )}

            {isGame && (
              <div>
                <h2 className="report-page__context-title">Report Context</h2>
                {gameDetails.loading && <p>Loading game details…</p>}
                {gameDetails.error && <p className="report-page__error">{gameDetails.error}</p>}
                {gameDetails.game && (
                  <div className="report-page__game-card">
                    <img
                      src={gameDetails.game.thumbnailUrl}
                      alt={gameDetails.game.title}
                      className="report-page__game-thumbnail"
                    />
                    <div>
                      <h3 className="report-page__game-title">{gameDetails.game.title}</h3>
                      <p className="report-page__game-studio">{gameDetails.game.studio}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isReview && (
              <div>
                <h2 className="report-page__context-title">Report Context</h2>
                {reviewDetails.loading && <p>Loading review details…</p>}
                {reviewDetails.error && <p className="report-page__error">{reviewDetails.error}</p>}
                {reviewDetails.game && reviewDetails.review && (
                  <>
                    <div className="report-page__game-card">
                      <img
                        src={reviewDetails.game.thumbnailUrl}
                        alt={reviewDetails.game.title}
                        className="report-page__game-thumbnail"
                      />
                      <div>
                        <h3 className="report-page__game-title">{reviewDetails.game.title}</h3>
                        <p className="report-page__game-studio">{reviewDetails.game.studio}</p>
                      </div>
                    </div>

                    <article
                      className="report-page__review-card"
                      aria-label="Review being reported"
                    >
                      <header className="report-page__review-header">
                        <h3>{reviewDetails.review.author}</h3>
                        <p className="report-page__review-date">
                          {new Date(reviewDetails.review.createdAt).toLocaleDateString()}
                        </p>
                      </header>
                      <p className="report-page__review-content">{reviewDetails.review.content}</p>
                      <p className="report-page__review-helper">
                        Please explain why you believe this review violates our community guidelines.
                      </p>
                    </article>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* White card for written description, voice recording, and submit button */}
        <div className="report-page__form-card">
          <ReportForm type={reportType} gameId={gameId} reviewId={reviewId} onSuccess={handleReportSubmitted} />
        </div>
      </section>
    </main>
  );
};

export default ReportPage;
