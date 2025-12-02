import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReportForm from '../components/report/ReportForm';
import { useGameReportDetails, useReviewReportDetails } from '../hooks/useReportDetails';
import type { ReportType } from '../services/reportApi';

interface RouteParams {
  reportType?: ReportType;
  gameId?: string;
  reviewId?: string;
}

interface ReportPageProps {
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
  initialType?: ReportType;
  initialGameId?: string;
  initialReviewId?: string;
  onBack?: () => void;
}

const REPORT_CONFIG: Record<ReportType, { pageTitle: string }> = {
  general: {
    pageTitle: 'Report a general issue:',
    },
  game: {
    pageTitle: 'You are reporting the following game:',
    },
  review: {
    pageTitle: 'You are reporting the following review:',
    },
};

const ReportPage: React.FC<ReportPageProps> = ({ onShowToast, initialType, initialGameId, initialReviewId, onBack }) => {
  const rawParams = useParams();
  const params = rawParams as RouteParams;
  const navigate = useNavigate();

  const routeType = (params.reportType as ReportType) || 'general';
  const type: ReportType = initialType || routeType;

  const gameIdFromRoute = params.gameId;
  const reviewIdFromRoute = params.reviewId;

  const gameId = initialGameId ?? gameIdFromRoute;
  const reviewId = initialReviewId ?? reviewIdFromRoute;

  const isGame = type === 'game';
  const isReview = type === 'review';

  const gameDetails = useGameReportDetails(isGame ? gameId : undefined);
  const reviewDetails = useReviewReportDetails(isReview ? reviewId : undefined);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const config = REPORT_CONFIG[type];

  const handleReportSubmitted = () => {
    if (onShowToast) {
      onShowToast('Your report has been submitted.', 'success');
    }
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      // Fallback: navigate to home if no back handler
      navigate('/');
    }
  };

  return (
    <main className="report-page" aria-label={config.pageTitle}>
      <button
        type="button"
        className="report-page__back"
        onClick={handleBackClick}
        aria-label="Go back to the previous page"
      >
        &larr; Back
      </button>

      <header className="report-page__header">
        <h1 className="report-page__title">{config.pageTitle}</h1>
      </header>

      <section className="report-page__card" aria-label="Reporting information and form">
        <div className="report-page__context">
          {type === 'general' && (
            <div className="report-page__context-block">
              <p className="report-page__context-intro">
                Tell us whats wrong. The more detail you can provide, the the better we can resolve the issue.
              </p>
            </div>
          )}

          {isGame && (
            <div className="report-page__context-block">
              
              {gameDetails.loading && <p>Loading game details...</p>}
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
            <div className="report-page__context-block">
              {reviewDetails.loading && <p>Loading review details...</p>}
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

                  <article className="report-page__review-card" aria-label="Review being reported">
                    <header className="report-page__review-header">
                      <h3>Author: {reviewDetails.review.author}</h3>
                      <p className="report-page__review-date">
                        {new Date(reviewDetails.review.createdAt).toLocaleDateString()}
                      </p>
                    </header>
                    <p className="report-page__review-content">{reviewDetails.review.content}</p>
                    
                  </article>
                </>
              )}
            </div>
          )}
        </div>

        <div className="report-page__form-card">
          <ReportForm type={type} gameId={gameId} reviewId={reviewId} onSuccess={handleReportSubmitted} />
        </div>
      </section>
    </main>
  );
};

export default ReportPage;
