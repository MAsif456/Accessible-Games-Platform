import { useEffect, useMemo, useState } from 'react';
import { useFavourites, FavouriteGameDto } from '../context/FavouritesContext';
import GameCard from '../components/GameCard';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

interface FavouritesPageProps {
  onNavigate?: (path: string) => void;
  onGameClick?: (gameId: string) => void;
}

const FavouritesPage: React.FC<FavouritesPageProps> = ({ onNavigate, onGameClick }) => {
  const { favourites, isLoading, fetchFavourites, removeFavourite, total, page, pageSize } =
    useFavourites();
  const [gameIdToRemove, setGameIdToRemove] = useState<string | null>(null);

  useEffect(() => {
    fetchFavourites(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const currentPageItems = useMemo(() => favourites, [favourites]);

  const openConfirm = (id: string) => setGameIdToRemove(id);
  const closeConfirm = () => setGameIdToRemove(null);

  const handleConfirmRemove = async () => {
    if (!gameIdToRemove) return;
    const id = gameIdToRemove;
    setGameIdToRemove(null);
    await removeFavourite(id);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    fetchFavourites(newPage);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const hasFavourites = total > 0;

  return (
    <main className="favourites-page" aria-label="Favourites page">
      <div className="favourites-page__inner">
        <header className="favourites-page__header favourites-page__header--sticky">
          <span className="favourites-page__icon" aria-hidden="true">
            ❤️
          </span>
          <div>
            <h1 className="favourites-page__title">Your Favourites</h1>
            {hasFavourites && (
              <p className="favourites-page__count">
                {total === 1 ? '1 game in your favourites' : `${total} games in your favourites`}
              </p>
            )}
          </div>
        </header>

        {hasFavourites && totalPages > 1 && (
          <p className="browse-page__page-indicator" aria-live="polite">
            Page {page} of {totalPages}
          </p>
        )}

        {!isLoading && !hasFavourites && (
          <section className="favourites-page__empty" aria-label="No favourites">
            <div className="favourites-page__empty-card">
              <div className="favourites-page__empty-icon" aria-hidden="true">
                ♡
              </div>
              <h2 className="favourites-page__empty-title">No Favourites Yet</h2>
              <p className="favourites-page__empty-text">
                Start adding games to your favourites to keep track of ones you love!
              </p>
              <button
                type="button"
                className="favourites-page__browse-button"
                onClick={() => onNavigate?.('/browse')}
              >
                Browse Games
              </button>
            </div>
          </section>
        )}

        {hasFavourites && (
          <>
            <section className="browse-page__grid" aria-label="Favourite games">
              {currentPageItems.map((game: FavouriteGameDto) => (
                <GameCard
                  key={game.id}
                  game={game as any}
                  onClick={() => onGameClick?.(game.id)}
                  favouriteLabel="Remove favourite"
                  onFavouriteClick={openConfirm}
                  isFavourite
                />
              ))}
            </section>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              ariaLabel="Favourites pagination"
            />
          </>
        )}
      </div>

      <Modal
        isOpen={!!gameIdToRemove}
        titleId="confirm-remove-title"
        descriptionId="confirm-remove-desc"
        onClose={closeConfirm}
      >
        <h2 id="confirm-remove-title" className="dialog__title">
          Remove from Favourites?
        </h2>
        <p id="confirm-remove-desc" className="dialog__message">
          Are you sure you want to remove this game from your favourites? You can always add it back later.
        </p>
        <div className="dialog__actions">
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={closeConfirm}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dialog__button dialog__button--primary"
            onClick={handleConfirmRemove}
          >
            Remove
          </button>
        </div>
      </Modal>
    </main>
  );
};

export default FavouritesPage;
