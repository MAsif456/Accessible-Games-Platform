import React, { useEffect, useState } from 'react';
import GameCard, { BasicGameLike } from '../components/GameCard';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import { useFavouritesNav } from '../context/FavouritesContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import type { AppPath } from '../App';
import { applyAccessibilityPreferences, DEFAULT_HIGH_CONTRAST_THEME } from '../utils/accessibility';

/**
 * Props for the RecentlyViewedPage component.
 * @interface RecentlyViewedPageProps
 * @property {function} [onNavigate] - Optional navigation callback
 * @property {function} [onGameClick] - Optional game click handler
 * @property {function} [showPrompt] - Optional notification callback
 */
interface RecentlyViewedPageProps {
  onNavigate?: (path: AppPath) => void;
  onGameClick?: (gameId: string) => void;
  showPrompt?: (message: string, type?: 'success' | 'error') => void;
}

/**
 * Recently Viewed page component displaying user's viewing history.
 *
 * @component
 * @param {RecentlyViewedPageProps} props - Component props
 * @returns {JSX.Element} The recently viewed page
 *
 * @description
 * Displays a user's recently viewed games in reverse chronological order.
 * Includes functionality to clear history with confirmation dialog.
 *
 * **Features:**
 * - Auto-fetches history when user is authenticated
 * - Grid display of game cards with favouriting capability
 * - Clear history button with confirmation modal
 * - Empty state with link to browse page
 * - Game count display
 *
 * **State Management:**
 * - Uses RecentlyViewedContext for games data and operations
 * - Uses FavouritesContext for favouriting games
 * - Manages local state for clear confirmation dialog
 *
 * @example
 * <RecentlyViewedPage
 *   onNavigate={navigate}
 *   onGameClick={handleGameClick}
 * />
 */
const RecentlyViewedPage: React.FC<RecentlyViewedPageProps> = ({
  onNavigate,
  onGameClick,
  showPrompt,
}) => {
  const { isAuthenticated, userSettings } = useAuth();
  const { isFavourite, toggleFavourite } = useFavouritesNav();
  const { games, total, isLoading, fetchRecentlyViewed, clearRecentlyViewed } = useRecentlyViewed();

  const [isClearing, setIsClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentlyViewed();
    }
  }, [isAuthenticated]);

  const handleClear = () => {
    setShowConfirm(true);
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await clearRecentlyViewed();
      if (showPrompt) {
        showPrompt('Recently viewed history cleared.', 'success');
      }
    } catch (err) {
      console.error(err);
      if (showPrompt) {
        showPrompt('Failed to clear recently viewed history.', 'error');
      }
    } finally {
      setIsClearing(false);
      setShowConfirm(false);
    }
  };

  const handleCancelClear = () => {
    setShowConfirm(false);
  };

  const hasRecentlyViewed = total > 0;

  const handleCardClick = (id: string) => {
    if (onGameClick) {
      onGameClick(id);
    } else if (onNavigate) {
      onNavigate(`/game/${id}`);
    }
  };

  return (
    <main
      className="recently-viewed-page favourites-page"
      aria-label="Recently viewed games"
    >
      <div className="favourites-page__inner">
        <header className="favourites-page__header favourites-page__header--sticky">
          <span className="favourites-page__icon" aria-hidden="true">
            🕒
          </span>

          <div>
            <h1 className="favourites-page__title">Recently Viewed</h1>
            {hasRecentlyViewed && (
              <p className="favourites-page__count">
                {total === 1
                  ? '1 game in your recently viewed'
                  : `${total} games in your recently viewed`}
              </p>
            )}
          </div>

          {hasRecentlyViewed && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClear}
              disabled={isClearing}
            >
              <span aria-hidden="true" style={{ marginRight: 4 }}>
                🗑
              </span>
              {isClearing ? 'Clearing...' : 'Clear History'}
            </button>
          )}
        </header>

        {!isLoading && !hasRecentlyViewed && (
          <section
            className="favourites-page__empty"
            aria-label="No recently viewed games"
          >
            <div className="favourites-page__empty-card">
              <div className="favourites-page__empty-icon" aria-hidden="true">
                🕒
              </div>
              <h2 className="favourites-page__empty-title">No Recently Viewed Games</h2>
              <p className="favourites-page__empty-text">
                You have not viewed any games yet. Browse the catalogue to start exploring.
              </p>
              {onNavigate && (
                <button
                  type="button"
                  className="favourites-page__browse-button"
                  onClick={() => onNavigate('/browse')}
                >
                  Browse Games
                </button>
              )}
            </div>
          </section>
        )}

        {hasRecentlyViewed && (
          <section
            className="browse-page__grid"
            aria-label="Recently viewed games list"
          >
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game as BasicGameLike}
                isFavourite={isFavourite(game.id)}
                favouriteLabel={isFavourite(game.id) ? 'Unfavourite' : 'Favourite'}
                onFavouriteClick={() => toggleFavourite(game.id)}
                onClick={() => handleCardClick(game.id)}
              />
            ))}
          </section>
        )}
      </div>

      <Modal
        isOpen={showConfirm}
        titleId="clear-history-title"
        descriptionId="clear-history-desc"
        onClose={handleCancelClear}
      >
        <h2 id="clear-history-title" className="dialog__title">
          Clear Viewing History?
        </h2>
        <p id="clear-history-desc" className="dialog__message">
          Are you sure you want to clear your entire viewing history? This action cannot be undone.
          {total > 0 && ` All ${total} games will be removed from this list.`}
        </p>
        <div className="dialog__actions">
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={handleCancelClear}
            disabled={isClearing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dialog__button dialog__button--primary"
            onClick={handleConfirmClear}
            disabled={isClearing}
          >
            Clear History
          </button>
        </div>
      </Modal>
    </main>
  );
};

export default RecentlyViewedPage;