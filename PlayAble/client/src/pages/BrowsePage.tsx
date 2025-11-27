import React, { useState } from 'react';
import { AppPath } from '../App';
import GameCard from '../components/GameCard';
import Pagination from '../components/ui/Pagination';
import { useBrowseGames } from '../hooks/useBrowseGames.ts';
import { useFavouritesNav } from '../context/FavouritesContext';

export interface Game {
  id: string;
  title: string;
  studio: string;
  description: string;
  thumbnailUrl: string;
  genres: string[];
  accessibilityTags: string[];
}

export interface BrowsePageProps {
  currentPath: AppPath;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  searchTerm: string;
  onGameClick: (gameId: string) => void;
  onSearchChange: (value: string) => void;
}

const BrowsePage: React.FC<BrowsePageProps> = ({
  currentPage,
  pageSize,
  onPageChange,
  searchTerm,
  onGameClick,
  onSearchChange,
}) => {
  const [browseSearchInput, setBrowseSearchInput] = useState(searchTerm);

  const { favouriteIds, toggleFavourite, isFavourite } = useFavouritesNav();

  const {
    games,
    totalPages,
    error,
    isFiltersOpen,
    setIsFiltersOpen,
    selectedGenres,
    setSelectedGenres,
    selectedAccessibility,
    releaseYear,
    setReleaseYear,
    sortBy,
    setSortBy,
    tempSelectedGenres,
    setTempSelectedGenres,
    tempSelectedAccessibility,
    setTempSelectedAccessibility,
    tempReleaseYear,
    setTempReleaseYear,
    tempSortBy,
    setTempSortBy,
    showAllGenres,
    setShowAllGenres,
    allGenres,
    allAccessibility,
    appliedFilterCount,
    hasActiveFilters,
    hasNoResults,
    handleApplyFilters,
    handleClearAll,
    removeAccessibility,
    toggleSelection,
  } = useBrowseGames({ currentPage, pageSize, searchTerm, onPageChange });

  const handleSearchSubmit = () => {
    const term = browseSearchInput.trim();
    onSearchChange(term);
    if (currentPage !== 1) {
      onPageChange(1);
    }
  };

  return (
    <main className="browse-page" aria-label="Browse accessible mobile games">
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
                  let value = e.target.value;

                  if (value.length > 50) {
                    value = value.slice(0, 50);
                  }
                  setBrowseSearchInput(value);
                  onSearchChange(value.trim());
                  if (currentPage !== 1) {
                    onPageChange(1);
                  }
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
              onClick={() => setIsFiltersOpen(true)}
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

      {hasActiveFilters && (
        <section className="browse-page__active-filters" aria-label="Active filters">
          <div className="browse-page__active-filters-inner">
            <div className="browse-page__active-filters-header">
              <p>Active filters:</p>
              <button type="button" className="browse-page__active-clear" onClick={handleClearAll}>
                Clear all
              </button>
            </div>
            <div className="browse-page__active-filters-chips">
              {selectedGenres.map((genre: string) => (
                <button
                  key={`genre-${genre}`}
                  type="button"
                  className="browse-page__active-chip"
                  onClick={() => setSelectedGenres((prev: string[]) => prev.filter((g: string) => g !== genre))}
                >
                  <span className="browse-page__active-chip-label">Genre: {genre}</span>
                  <span className="browse-page__active-chip-close" aria-hidden="true">
                    ×
                  </span>
                  <span className="sr-only">Remove genre filter {genre}</span>
                </button>
              ))}
              {selectedAccessibility.map((tag: string) => (
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
              {releaseYear !== 'Any Year' && (
                <button
                  type="button"
                  className="browse-page__active-chip"
                  onClick={() => setReleaseYear('Any Year')}
                >
                  <span className="browse-page__active-chip-label">
                    Release Year: {releaseYear}
                  </span>
                  <span className="browse-page__active-chip-close" aria-hidden="true">
                    ×
                  </span>
                  <span className="sr-only">Remove release year filter</span>
                </button>
              )}
              {sortBy !== 'A-Z' && (
                <button
                  type="button"
                  className="browse-page__active-chip"
                  onClick={() => setSortBy('A-Z')}
                >
                  <span className="browse-page__active-chip-label">Sort By: {sortBy}</span>
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

      {totalPages > 1 && (
        <p className="browse-page__page-indicator" aria-live="polite">
          Page {currentPage} of {totalPages}
        </p>
      )}

      {hasNoResults ? (
        <p role="status" className="browse-page__no-results">
          Oops! We couldn’t find any games matching your filters. Try tweaking your selections or
          clearing all filters to explore more games.
        </p>
      ) : (
        <>
          <section className="browse-page__grid" aria-label="Game catalogue">
            {games.map((game: Game) => (
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

      <aside
        id="browse-filters-panel"
        className={`browse-filters ${isFiltersOpen ? 'browse-filters--open' : ''}`}
        aria-hidden={!isFiltersOpen}
      >
        <div className="browse-filters__overlay" onClick={() => setIsFiltersOpen(false)} />
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
              onClick={() => setIsFiltersOpen(false)}
              aria-label="Close filters"
            >
              ×
            </button>
          </header>

          <div className="browse-filters__top-actions">
            <button type="button" className="browse-filters__clear" onClick={handleClearAll}>
              Clear All
            </button>
            <button
              type="button"
              className="browse-filters__apply browse-filters__apply--primary"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </button>
          </div>

          <div className="browse-filters__body">
            <section className="browse-filters__section">
              <header className="browse-filters__section-header">
                <h3>Genre</h3>
              </header>
              <div className="browse-filters__chips">
                {(showAllGenres ? allGenres : allGenres.slice(0, 20)).map((genre: string) => {
                  const isSelected = tempSelectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      className={
                        'browse-filters__chip' +
                        (isSelected ? ' browse-filters__chip--selected' : '')
                      }
                      onClick={() =>
                        toggleSelection(genre, tempSelectedGenres, setTempSelectedGenres)
                      }
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
              {allGenres.length > 20 && (
                <button
                  type="button"
                  className="browse-filters__show-more"
                  onClick={() => setShowAllGenres((prev: boolean) => !prev)}
                >
                  {showAllGenres ? 'Show less' : 'Show more'}
                </button>
              )}
            </section>

            <section className="browse-filters__section">
              <header className="browse-filters__section-header">
                <h3>Accessibility Categories</h3>
                <p className="browse-filters__counter">
                  {tempSelectedAccessibility.length}/5 selected
                </p>
              </header>
              <div className="browse-filters__chips">
                {allAccessibility.map((tag: string) => {
                  const isSelected = tempSelectedAccessibility.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={
                        'browse-filters__chip' +
                        (isSelected ? ' browse-filters__chip--selected' : '')
                      }
                      onClick={() => {
                        if (!isSelected && tempSelectedAccessibility.length >= 5) return;
                        toggleSelection(
                          tag,
                          tempSelectedAccessibility,
                          setTempSelectedAccessibility,
                        );
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="browse-filters__section">
              <header className="browse-filters__section-header">
                <h3>Release Year</h3>
              </header>
              <select
                className="browse-filters__select"
                value={tempReleaseYear}
                onChange={e => setTempReleaseYear(e.target.value)}
              >
                <option value="Any Year">Any Year</option>
                {Array.from({ length: new Date().getFullYear() - 2010 }, (_, i) => 2011 + i)
                  .reverse()
                  .map(year => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
              </select>
            </section>

            <section className="browse-filters__section">
              <header className="browse-filters__section-header">
                <h3>Sort By</h3>
              </header>
              <select
                className="browse-filters__select"
                value={tempSortBy}
                onChange={e => setTempSortBy(e.target.value)}
              >
                <option value="A-Z">A-Z (Alphabetical)</option>
                <option value="Newest">Newest first</option>
                <option value="Oldest">Oldest first</option>
              </select>
            </section>
          </div>

          <footer className="browse-filters__footer">
            <button type="button" className="browse-filters__clear" onClick={handleClearAll}>
              Clear All
            </button>
            <button
              type="button"
              className="browse-filters__apply browse-filters__apply--primary"
              onClick={handleApplyFilters}
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
