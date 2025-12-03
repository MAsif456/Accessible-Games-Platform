import { useMemo, useState } from 'react';
import { useFavourites, FavouriteGameDto } from '../context/FavouritesContext';
import GameCard from '../components/GameCard';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

/**
 * Props for the favourites page. Navigation and game-click behaviour are
 * delegated to the parent (App) so this component stays presentational.
 */
interface FavouritesPageProps {
  /** Optional callback to navigate to another route (e.g. Browse). */
  onNavigate?: (path: string) => void;
  /** Optional callback when a game card is activated. */
  onGameClick?: (gameId: string) => void;
}

/**
 * FavouritesPage renders the user's saved games with simple pagination.
 *
 * Responsibilities:
 * - Fetch and display the current page of favourite games.
 * - Show an accessible empty state when there are no favourites.
 * - Provide a confirmation dialog before removing a favourite.
 * - Delegate data fetching and mutation to the FavouritesContext hook.
 */
const FavouritesPage: React.FC<FavouritesPageProps> = ({ onNavigate, onGameClick }) => {
  const { favourites, isLoading, fetchFavourites, removeFavourite, total, pageSize, error } =
    useFavourites();

  // Id of the game pending removal, used to drive the confirmation modal.
  const [gameIdToRemove, setGameIdToRemove] = useState<string | null>(null);
  // Current pagination index for the favourites list.
  const [currentPage, setCurrentPage] = useState(1);

  // Compute total number of pages; never show less than one page.
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // FavouritesContext already returns the items for the current page; memoise
  // for clarity and potential future transformation.
  const currentPageItems = useMemo(() => favourites, [favourites]);

  const openConfirm = (id: string) => setGameIdToRemove(id);
  const closeConfirm = () => setGameIdToRemove(null);

  /**
   * Confirm removal of the selected favourite. The modal is closed first so
   * the UI feels snappy, then the backing store is updated asynchronously.
   */
  const handleConfirmRemove = async () => {
    if (!gameIdToRemove) return;
    const id = gameIdToRemove;
    setGameIdToRemove(null);
    await removeFavourite(id);
  };

  /**
   * Handle pagination changes from the Pagination component. Guard against
   * out-of-range and duplicate page requests, then fetch the new page and
   * scroll back to the top for better usability.
   */
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchFavourites(newPage);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const hasFavourites = total > 0;

  return (
    <main className="favourites-page" aria-label="Favourites page">
      <div className="favourites-page__inner">
        {/* Sticky header with page title and favourites count */}
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

        {/* Error summary (e.g. network failures when loading favourites) */}
        {error && (
          <p className="browse-page__no-results" role="status">
            {error}
          </p>
        )}

        {/* Page indicator when favourites span multiple pages */}
        {hasFavourites && totalPages > 1 && (
          <p className="browse-page__page-indicator" aria-live="polite">
            Page {currentPage} of {totalPages}
          </p>
        )}

        {/* Empty state when the user has no favourites yet */}
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

        {/* Grid of favourite game cards plus local pagination controls */}
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
              page={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              ariaLabel="Favourites pagination"
            />
          </>
        )}
      </div>

      {/* Confirmation dialog for removing a favourite */}
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
          Are you sure you want to remove this game from your favourites? You can always add it
          back later.
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
