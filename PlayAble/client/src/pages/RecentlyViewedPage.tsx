import React, { useEffect, useState } from 'react';
import GameCard, { BasicGameLike } from '../components/GameCard';
import { clearRecentlyViewed, getRecentlyViewed, RecentlyViewedResponse } from '../services/api';
import { useFavouritesNav } from '../context/FavouritesContext';
import { useAuth } from '../context/AuthContext';
import type { AppPath } from '../App';

interface RecentlyViewedPageProps {
  onNavigate?: (path: AppPath) => void;
  onGameClick?: (gameId: string) => void;
}

const RecentlyViewedPage: React.FC<RecentlyViewedPageProps> = ({ onNavigate, onGameClick }) => {
  const { isAuthenticated } = useAuth();
  const { isFavourite, toggleFavourite } = useFavouritesNav();
  const [data, setData] = useState<RecentlyViewedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getRecentlyViewed();
        if (!isMounted) return;
        setData(result);
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setError('Unable to load recently viewed games.');
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleClear = () => {
    setShowConfirm(true);
  };

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await clearRecentlyViewed();
      setData({ games: [], total: 0, showing: '0 of 0' });
      alert('Recently viewed history cleared.');
    } catch (err) {
      console.error(err);
      alert('Failed to clear recently viewed history.');
    } finally {
      setIsClearing(false);
      setShowConfirm(false);
    }
  };

  const handleCancelClear = () => {
    setShowConfirm(false);
  };

  const games = data?.games ?? [];
  const total = data?.total ?? 0;

  const handleCardClick = (id: string) => {
    if (onGameClick) {
      onGameClick(id);
    }
    if (onNavigate) {
      onNavigate('/game-details');
    }
  };

  return (
    <main className="browse-page" aria-label="Recently viewed games">
      <header className="browse-page__header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span aria-hidden="true" className="navbar__nav-icon navbar__nav-icon--clock" />
            <h1 className="favourites-page__title">Recently Viewed</h1>
          </div>
          <p className="favourites-page__count">
            {total > 0
              ? `Showing 1-${total} of ${total} games`
              : 'You have not viewed any games yet.'}
          </p>
        </div>
        {total > 0 && (
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

      {isLoading && <p className="browse-page__results">Loading recently viewed games</p>}
      {error && !isLoading && <p className="browse-page__results">{error}</p>}

      {!isLoading && !error && total === 0 && (
        <section className="favourites-page__empty" aria-label="No recently viewed games">
          <div className="favourites-page__empty-card">
            <p className="favourites-page__empty-text">
              You have not viewed any games yet. Browse the catalogue to start exploring.
            </p>
            {onNavigate && (
              <button
                type="button"
                className="favourites-page__browse-button"
                onClick={() => onNavigate('/browse')}
              >
                Go to Browse
              </button>
            )}
          </div>
        </section>
      )}

      {!isLoading && !error && total > 0 && (
        <section className="browse-page__grid" aria-label="Recently viewed games list">
          {games.map(game => (
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

      {showConfirm && (
        <div
          className="modal-backdrop"
          role="presentation"
        >
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-history-title"
          >
            <div className="modal-content">
              <header className="modal-header">
                <h2 id="clear-history-title" className="modal-title">
                  Clear Viewing History?
                </h2>
              </header>
              <div className="modal-body">
                <p>
                  Are you sure you want to clear your entire viewing history? This action cannot be undone.
                  {total > 0 && ` All ${total} games will be removed from this list.`}
                </p>
              </div>
              <footer className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelClear}
                  disabled={isClearing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmClear}
                  disabled={isClearing}
                >
                  Clear History
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default RecentlyViewedPage;
