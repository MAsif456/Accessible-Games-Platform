import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReportForm from '../components/report/ReportForm';
import { useGameReportDetails, useReviewReportDetails } from '../hooks/useReportDetails';
import type { ReportType } from '../services/reportApi';
import { useAuth } from '../context/AuthContext';
import { applyAccessibilityPreferences, DEFAULT_HIGH_CONTRAST_THEME } from '../utils/accessibility';

/** Route params expected from react-router for the report flow. */
interface RouteParams {
  reportType?: ReportType;
  gameId?: string;
  reviewId?: string;
}

/**
 * Props for ReportPage. When used inside the main app router, most of these are
 * derived from the URL. For embedded/inline use, the *initial* values allow
 * overriding the route (e.g. reporting a specific game from a modal).
 */
interface ReportPageProps {
  /** Optional toast callback for feedback after a successful submit. */
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
  /** Optional initial report type when not coming directly from the route. */
  initialType?: ReportType;
  /** Optional initial game id for game reports. */
  initialGameId?: string;
  /** Optional initial review id for review reports. */
  initialReviewId?: string;
  /** Optional back handler so parents can control navigation. */
  onBack?: () => void;
}

/**
 * Static copy and labels for each supported report type.
 */
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

/**
 * ReportPage renders the context around what is being reported (general issue,
 * a specific game, or a specific review) alongside the shared ReportForm.
 *
 * Responsibilities:
 * - Derive the report type, game id and review id from either the route
 *   parameters or optional initial props.
 * - Fetch and display contextual details for game/review reports.
 * - Provide a robust back navigation behaviour when no onBack handler is given.
 * - Surface submission success via an optional toast callback.
 */
const ReportPage: React.FC<ReportPageProps> = ({
  onShowToast,
  initialType,
  initialGameId,
  initialReviewId,
  onBack,
}) => {
  const { userSettings } = useAuth();
  const rawParams = useParams();
  const params = rawParams as RouteParams;
  const navigate = useNavigate();

  // Validate reportType from route params and default to 'general' when invalid
  const validReportTypes: ReportType[] = ['general', 'game', 'review'];
  const routeTypeParam = params.reportType as ReportType | undefined;
  const safeRouteType: ReportType = routeTypeParam && validReportTypes.includes(routeTypeParam)
    ? routeTypeParam
    : 'general';

  // Prefer explicit initialType when provided, otherwise use validated routeType
  const type: ReportType = initialType || safeRouteType;

  const gameIdFromRoute = params.gameId;
  const reviewIdFromRoute = params.reviewId;

  // Allow explicit initial ids to override those from the route.
  const gameId = initialGameId ?? gameIdFromRoute;
  const reviewId = initialReviewId ?? reviewIdFromRoute;

  const isGame = type === 'game';
  const isReview = type === 'review';

  // Fetch additional details to provide context when reporting a game or review.
  const gameDetails = useGameReportDetails(isGame ? gameId : undefined);
  const reviewDetails = useReviewReportDetails(isReview ? reviewId : undefined);

  /**
   * Applies accessibility preferences to the document when visual settings change.
   * Updates CSS custom properties and classes to reflect high contrast mode, theme,
   * reduced motion, and dark mode preferences.
   * 
   * @effect
   * @dependencies userSettings
   */
  useEffect(() => {
    if (userSettings) {
      applyAccessibilityPreferences(userSettings);
    } else {
      // For non-logged-in users, check session storage for settings
      const SESSION_STORAGE_KEY = 'playable_session_settings';
      try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const sessionSettings = {
            ...parsed,
            highContrastTheme: parsed.highContrastTheme || DEFAULT_HIGH_CONTRAST_THEME,
          };
          applyAccessibilityPreferences(sessionSettings);
        } else {
          // Apply default preferences (all off)
          applyAccessibilityPreferences({
            highContrastMode: false,
            darkMode: false,
            highContrastTheme: DEFAULT_HIGH_CONTRAST_THEME,
          });
        }
      } catch (error) {
        console.error('Failed to load session settings:', error);
        // Apply default preferences on error
        applyAccessibilityPreferences({
          highContrastMode: false,
          darkMode: false,
          highContrastTheme: DEFAULT_HIGH_CONTRAST_THEME,
        });
      }
    }
  }, [userSettings]);

  // Ensure the user is scrolled to the top when opening the report page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Ensure config exists, default to general if type is invalid
  const config = REPORT_CONFIG[type] || REPORT_CONFIG.general;

  /** Notify the caller that the report was successfully submitted. */
  const handleReportSubmitted = () => {
    if (onShowToast) {
      onShowToast('Your report has been submitted.', 'success');
    }
  };

  /**
   * Back navigation that prefers a parent-provided handler, then falls back
   * to the browser history stack, and finally to a safe default route.
   */
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
      {/* Back button stays inside the main landmark for keyboard users */}
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
          {/* General reports have no specific game/review context */}
          {type === 'general' && (
            <div className="report-page__context-block">
              <p className="report-page__context-intro">
                Tell us whats wrong. The more detail you can provide, the the better we can
                resolve the issue.
              </p>
            </div>
          )}

          {/* Game report context: show basic game details above the form */}
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

          {/* Review report context: show the game and the specific review content */}
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

        {/* Shared report form; behaviour changes based on type/gameId/reviewId props */}
        <div className="report-page__form-card">
          <ReportForm
            type={type}
            gameId={gameId}
            reviewId={reviewId}
            onSuccess={handleReportSubmitted}
          />
        </div>
      </section>
    </main>
  );
};

export default ReportPage;
