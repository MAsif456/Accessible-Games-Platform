import React, { useEffect, useMemo, useState } from 'react';
import { AppPath } from '../App';
import GameCard from '../components/GameCard';
import Pagination from '../components/ui/Pagination';
import { useBrowseGames } from '../hooks/useBrowseGames';
import { useFavouritesNav } from '../context/FavouritesContext';
import { useAuth } from '../context/AuthContext';
import { applyAccessibilityPreferences, DEFAULT_HIGH_CONTRAST_THEME } from '../utils/accessibility';
import { GameDto } from '../services/api';

// Public props for the browse page. The actual routing state (currentPath, currentPage,
// search term etc.) is owned by the parent (App) so this component stays presentational
// and easy to test.
/**
 * BrowsePage props are provided by the top-level router (App).
 * The page itself stays presentational: it renders the catalogue UI
 * and raises events when paging, searching or clicking games.
 */
export interface BrowsePageProps {
  currentPath: AppPath;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  searchTerm: string;
  onGameClick: (gameId: string) => void;
  onSearchChange: (value: string) => void;
}

// Main catalogue page used to browse accessible games with search, filters, sorting
// and favourite toggling. Data fetching and filter state are delegated to hooks so
// this component focuses on layout and interaction wiring.
/**
 * Main catalogue page used to browse accessible games.
 *
 * Responsibilities:
 * - Render search input with debounced updates to the parent.
 * - Display filter chips, active filter summary and pagination.
 * - Delegate data fetching and filter state to useBrowseGames.
 * - Integrate favourites via useFavouritesNav.
 */
const BrowsePage: React.FC<BrowsePageProps> = ({
  currentPage,
  pageSize,
  onPageChange,
  searchTerm,
  onGameClick,
  onSearchChange,
}) => {
  // Local input value for the search box, debounced before notifying the parent.
  const [browseSearchInput, setBrowseSearchInput] = useState(searchTerm);
  const [effectiveSearchTerm, setEffectiveSearchTerm] = useState(searchTerm);
  const [showAllGenres, setShowAllGenres] = useState(false);

  // Keep the local search input in sync when the parent-controlled searchTerm changes
  // (e.g. when navigation or clear buttons reset it).
  useEffect(() => {
    setBrowseSearchInput(searchTerm);
    setEffectiveSearchTerm(searchTerm);
  }, [searchTerm]);

  // Lightweight favourites API used by cards to render and toggle favourites.
  const { favouriteIds, toggleFavourite, isFavourite } = useFavouritesNav();
  const { userSettings } = useAuth();

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

  // Core browse data (games list, filters, metadata, errors) comes from a dedicated hook
  // so that pagination, filtering and server integration stay encapsulated.
  const {
    games,
    totalPages,
    error,
    hasNoResults,
    filters,
    metadata,
    sortOptions,
    defaultSortId,
    accessibilityLimit,
  } = useBrowseGames({
    currentPage,
    pageSize,
    searchTerm: effectiveSearchTerm,
    onPageChange,
  });

  // Destructure filter helpers and state used by the UI controls below.
  const {
    active,
    draft,
    isOpen: isFiltersOpen,
    hasActiveFilters,
    appliedFilterCount,
    open,
    close,
    apply,
    clear,
    removeGenre,
    removeAccessibility,
    toggleDraftGenre,
    toggleDraftAccessibility,
    setDraftSort,
    resetSort,
  } = filters;

  // Debounced search: wait briefly after the user types before notifying the parent.
  // This reduces API calls and keeps the UI responsive. Also resets to page 1 when
  // the query changes so results always start from the first page.
  useEffect(() => {
    const trimmed = browseSearchInput.trim();
    if (trimmed === effectiveSearchTerm) return;

    const handle = window.setTimeout(() => {
      setEffectiveSearchTerm(trimmed);
      onSearchChange(trimmed);
      if (currentPage !== 1) {
        onPageChange(1);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [browseSearchInput, effectiveSearchTerm, onSearchChange, onPageChange, currentPage]);

  /**
   * Commit the current search input immediately (e.g. when the user presses Enter)
   * and reset to the first page if needed.
   */
  const handleSearchSubmit = () => {
    const term = browseSearchInput.trim();
    setEffectiveSearchTerm(term);
    onSearchChange(term);
    if (currentPage !== 1) {
      onPageChange(1);
    }
  };

  // Limit the number of genre chips shown by default to keep the layout manageable.
  const visibleGenres = showAllGenres ? metadata.genres : metadata.genres.slice(0, 20);

  // Compute a human-readable label for the current sort option. Memoised so we do not
  // recompute on every render unless dependencies change.
  const sortLabel = useMemo(
    () => sortOptions.find(option => option.id === active.sort)?.label ?? 'Sort By',
    [active.sort, sortOptions]
  );
  const showSortChip = active.sort !== defaultSortId;

  return (
    <main className="browse-page" aria-label="Browse accessible mobile games">
      {/* Header area with search, clear button and filters entry point */}
      <header className="browse-page__header">
        <div className="browse-page__search-wrapper">
          <div className="browse-page__search-bar">
            <div className="browse-page__search-main">
              <span className="browse-page__search-icon" aria-hidden="true" />
              <input
                type="search"
                className="browse-page__search-input"
                value={browseSearchInput}
                onChange={e => {
                  // Apply a defensive max length to keep the search term reasonable
                  // for both performance and accessibility.
                  let value = e.target.value;
                  if (value.length > 50) {
                    value = value.slice(0, 50);
                  }
                  setBrowseSearchInput(value);
                }}
                placeholder="Search games by name or keyword"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
              />
              {browseSearchInput && (
                <button
                  type="button"
                  className="browse-page__search-clear navbar__search-clear--full"
                  onClick={() => {
                    setBrowseSearchInput('');
                    setEffectiveSearchTerm('');
                    onSearchChange('');
                    if (currentPage !== 1) onPageChange(1);
                  }}
                >
                  <span aria-hidden="true" className="browse-page__search-clear-icon">
                    ×
                  </span>
                  <span className="browse-page__search-clear-label">Clear</span>
                </button>
              )}
            </div>

            <button
              type="button"
              className="browse-page__filters-button browse-page__filters-button--primary"
              onClick={open}
            >
              <span className="browse-page__filters-icon" aria-hidden="true" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="browse-page__filters-count" aria-hidden="true">
                  {appliedFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="browse-page__header-right" />
      </header>

      {/* Chip-style summary of currently active filters and sort order */}
      {hasActiveFilters && (
        <section className="browse-page__active-filters" aria-label="Active filters">
          <div className="browse-page__active-filters-inner">
            <div className="browse-page__active-filters-header">
              <p>Active filters:</p>
              <button type="button" className="browse-page__active-clear" onClick={clear}>
                Clear all
              </button>
            </div>
            <div className="browse-page__active-filters-chips">
              {active.genres.map((genre: string) => (
                <button
                  key={`genre-${genre}`}
                  type="button"
                  className="browse-page__active-chip"
                  onClick={() => removeGenre(genre)}
                >
                  <span className="browse-page__active-chip-label">Genre: {genre}</span>
                  <span className="browse-page__active-chip-close" aria-hidden="true">
                    ×
                  </span>
                  <span className="sr-only">Remove genre filter {genre}</span>
                </button>
              ))}
              {active.accessibility.map((tag: string) => (
                <button
                  key={`access-${tag}`}
                  type="button"
                  className="browse-page__active-chip"
                  onClick={() => removeAccessibility(tag)}
                >
                  <span className="browse-page__active-chip-label">Accessibility: {tag}</span>
                  <span className="browse-page__active-chip-close" aria-hidden="true">
                    ×
                  </span>
                  <span className="sr-only">Remove accessibility filter {tag}</span>
                </button>
              ))}
              {showSortChip && (
                <button
                  type="button"
                  className="browse-page__active-chip"
                  onClick={resetSort}
                >
                  <span className="browse-page__active-chip-label">Sort By: {sortLabel}</span>
                  <span className="browse-page__active-chip-close" aria-hidden="true">
                    ×
                  </span>
                  <span className="sr-only">Remove sort by filter</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Lightweight page indicator above the grid */}
      {totalPages > 1 && (
        <p className="browse-page__page-indicator" aria-live="polite">
          Page {currentPage} of {totalPages}
        </p>
      )}

      {hasNoResults ? (
        <p role="status" className="browse-page__no-results">
          Oops! We couldn&apos;t find any games matching your filters. Try tweaking your selections
          or clearing all filters to explore more games.
        </p>
      ) : (
        <>
          {/* Main grid of game cards */}
          <section className="browse-page__grid" aria-label="Game catalogue">
            {(games || []).map((game: GameDto) => (
              <GameCard
                key={game.id}
                game={game}
                onClick={() => onGameClick(game.id)}
                favouriteLabel={isFavourite(game.id) ? 'Unfavourite' : 'Favourite'}
                onFavouriteClick={toggleFavourite}
                isFavourite={favouriteIds.has(game.id)}
              />
            ))}
          </section>

          {/* Paged navigation below the grid */}
          {totalPages > 1 && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              ariaLabel="Catalogue pagination"
            />
          )}
        </>
      )}

      {/* Off-canvas filters panel used on smaller viewports */}
      <aside
        id="browse-filters-panel"
        className={`browse-filters ${isFiltersOpen ? 'browse-filters--open' : ''}`}
        aria-hidden={!isFiltersOpen}
      >
        <div className="browse-filters__overlay" onClick={close} />
        <div className="browse-filters__panel" role="dialog" aria-modal="true" aria-label="Filters">
          <header className="browse-filters__header">
            <div>
              <h2>Filters</h2>
              <p className="browse-filters__subtitle">
                Refine your game search with detailed filters. You can select up to 5 accessibility
                categories.
              </p>
            </div>
            <button
              type="button"
              className="browse-filters__close"
              onClick={close}
              aria-label="Close filters"
            >
              ×
            </button>
          </header>

          <div className="browse-filters__top-actions">
            <button type="button" className="browse-filters__clear" onClick={clear}>
              Clear All
            </button>
            <button
              type="button"
              className="browse-filters__apply browse-filters__apply--primary"
              onClick={apply}
            >
              Apply Filters
            </button>
          </div>

          <div className="browse-filters__body">
            {/* Genre filter section */}
            <section className="browse-filters__section">
              <header className="browse-filters__section-header">
                <h3>Genre</h3>
              </header>
              <div className="browse-filters__chips">
                {visibleGenres.map((genre: string) => {
                  const isSelected = draft.genres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      className={
                        'browse-filters__chip' +
                        (isSelected ? ' browse-filters__chip--selected' : '')
                      }
                      onClick={() => toggleDraftGenre(genre)}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
              {metadata.genres.length > 20 && (
                <button
                  type="button"
                  className="browse-filters__show-more"
                  onClick={() => setShowAllGenres((prev: boolean) => !prev)}
                >
                  {showAllGenres ? 'Show less' : 'Show more'}
                </button>
              )}
            </section>

            {/* Accessibility tags filter section with selection limit */}
            <section className="browse-filters__section">
              <header className="browse-filters__section-header">
                <h3>Accessibility Categories</h3>
                <p className="browse-filters__counter">
                  {draft.accessibility.length}/{accessibilityLimit} selected
                </p>
              </header>
              <div className="browse-filters__chips">
                {metadata.accessibility.map((tag: string) => {
                  const isSelected = draft.accessibility.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={
                        'browse-filters__chip' +
                        (isSelected ? ' browse-filters__chip--selected' : '')
                      }
                      onClick={() => {
                        if (!isSelected && draft.accessibility.length >= accessibilityLimit) return;
                        toggleDraftAccessibility(tag);
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Sort selector */}
            <section className="browse-filters__section">
              <header className="browse-filters__section-header">
                <h3>Sort By</h3>
              </header>
              <select
                className="browse-filters__select"
                value={draft.sort}
                onChange={e => setDraftSort(e.target.value as (typeof sortOptions)[number]['id'])}
              >
                {sortOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </section>
          </div>

          <footer className="browse-filters__footer">
            <button type="button" className="browse-filters__clear" onClick={clear}>
              Clear All
            </button>
            <button
              type="button"
              className="browse-filters__apply browse-filters__apply--primary"
              onClick={apply}
            >
              Apply Filters
            </button>
          </footer>
        </div>
      </aside>
      {error && (
        <p className="browse-page__no-results" role="status">
          {error}
        </p>
      )}
    </main>
  );
};

export default BrowsePage;
