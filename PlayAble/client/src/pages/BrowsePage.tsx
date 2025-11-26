import React, { useMemo, useState, useEffect } from 'react';
import { AppPath } from '../App';
import { getGames, GameDto } from '../services/api.ts';

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
  onToggleFavourite: (gameId: string) => void;
  favourites: Set<string>;
  onSearchChange: (value: string) => void;
}

// Subcomponents (composite pieces)
const GameThumbnail: React.FC<{ url: string; title: string }> = ({ url, title }) => (
  <img className="game-card__thumbnail" src={url} alt={title} />
);

const GameHeader: React.FC<{ title: string; studio: string }> = ({ title, studio }) => (
  <header className="game-card__header">
    <h2 className="game-card__title">{title}</h2>
    <p className="game-card__studio">{studio}</p>
  </header>
);

const GameDescription: React.FC<{ description: string }> = ({ description }) => (
  <p className="game-card__description">{description}</p>
);

const GameTags: React.FC<{ genres: string[]; tags: string[] }> = ({ genres, tags }) => (
  <div className="game-card__meta">
    <div className="game-card__tags">
      {genres.map(g => (
        <span key={g} className="pill pill--genre">
          {g}
        </span>
      ))}
    </div>
    <div className="game-card__accessibility">
      {tags.map(t => (
        <span key={t} className="pill pill--accessibility">
          {t}
        </span>
      ))}
    </div>
  </div>
);

interface GameCardProps {
  game: GameDto;
  isFavourite: boolean;
  onClick: () => void;
  onToggleFavourite: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, isFavourite, onClick, onToggleFavourite }) => {
  return (
    <article
      className="game-card"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="game-card__favourite-wrapper">
        <button
          type="button"
          className={
            'game-card__favourite-button' +
            (isFavourite ? ' game-card__favourite-button--active' : '')
          }
          onClick={e => {
            e.stopPropagation();
            onToggleFavourite();
          }}
          aria-pressed={isFavourite}
          style={{
            backgroundColor: 'white',
            border: '1px solid black',
          }}
        >
          <span
            className={
              'game-card__favourite-icon' +
              (isFavourite ? ' game-card__favourite-icon--active' : '')
            }
            aria-hidden="true"
            style={{
              display: 'inline-block',
              fontSize: '24px',
              lineHeight: 1,
              color: isFavourite ? 'red' : 'white',
              WebkitTextStroke: '2px black',
              verticalAlign: 'middle',
              position: 'relative',
            }}
          >
            {/* Heart shape */}♥
            {isFavourite && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  width: '100%',
                  height: '2px',
                  backgroundColor: 'white',
                  transform: 'translateY(-50%) rotate(-45deg)',
                  transformOrigin: 'center',
                }}
              />
            )}
          </span>

          <span style={{ marginLeft: '8px' }}>{isFavourite ? 'Unfavourite' : 'Favourite'}</span>
        </button>
      </div>
      <GameThumbnail url={game.thumbnailUrl} title={game.title} />
      <div className="game-card__body">
        <GameHeader title={game.title} studio={game.studio} />
        <GameDescription description={game.description} />
        <GameTags genres={game.genres} tags={game.accessibilityTags} />
      </div>
    </article>
  );
};

const BrowsePage: React.FC<BrowsePageProps> = ({
  currentPage,
  pageSize,
  onPageChange,
  searchTerm,
  onGameClick,
  onToggleFavourite,
  favourites,
  onSearchChange,
}) => {
  const [browseSearchInput, setBrowseSearchInput] = useState(searchTerm);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedAccessibility, setSelectedAccessibility] = useState<string[]>([]);
  const [releaseYear, setReleaseYear] = useState<string>('Any Year');
  const [sortBy, setSortBy] = useState<string>('A-Z');

  const [tempSelectedGenres, setTempSelectedGenres] = useState<string[]>([]);
  const [tempSelectedAccessibility, setTempSelectedAccessibility] = useState<string[]>([]);
  const [tempReleaseYear, setTempReleaseYear] = useState<string>('Any Year');
  const [tempSortBy, setTempSortBy] = useState<string>('A-Z');
  const [showAllGenres, setShowAllGenres] = useState(false);

  const [games, setGames] = useState<GameDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allGamesForFilters, setAllGamesForFilters] = useState<GameDto[]>([]);

  const safeAllGamesForFilters = allGamesForFilters ?? [];

  const effectiveSearchTerm = searchTerm;

  const apiSort = useMemo(() => {
    switch (sortBy) {
      case 'Newest':
        return 'newest';
      case 'Oldest':
        return 'oldest';
      case 'A-Z':
      default:
        return 'title_asc';
    }
  }, [sortBy]);

  const allGenres = useMemo(
    () => Array.from(new Set(safeAllGamesForFilters.flatMap(g => g.genres || []))).sort(),
    [safeAllGamesForFilters],
  );

  const allAccessibility = useMemo(
    () => Array.from(new Set(safeAllGamesForFilters.flatMap(g => g.accessibilityTags || []))).sort(),
    [safeAllGamesForFilters],
  );

  const toggleSelection = (value: string, current: string[], setter: (val: string[]) => void) => {
    setter(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  useEffect(() => {
    let isCancelled = false;
    async function loadGames() {
      try {
        setLoading(true);
        setError(null);
        const { games, totalPages, totalResults } = await getGames({
          page: currentPage,
          pageSize,
          search: effectiveSearchTerm || undefined,
          genres: selectedGenres.length ? selectedGenres : undefined,
          tags: selectedAccessibility.length ? selectedAccessibility : undefined,
          sort: apiSort,
        });
        if (!isCancelled) {
          setGames(games);
          setTotalPages(totalPages);
          setTotalResults(totalResults);
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Failed to load games');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadGames();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, pageSize, effectiveSearchTerm, selectedGenres, selectedAccessibility, apiSort]);

  useEffect(() => {
    let isCancelled = false;
    async function loadAllGamesForFilters() {
      try {
        const { games } = await getGames({ page: 1, pageSize: 1000, sort: 'title_asc' });
        if (!isCancelled) {
          setAllGamesForFilters(games);
        }
      } catch {
    
      }
    }
    loadAllGamesForFilters();
    return () => {
      isCancelled = true;
    };
  }, []);

  const appliedFilterCount =
    selectedGenres.length +
    selectedAccessibility.length +
    (releaseYear === 'Any Year' ? 0 : 1) +
    (sortBy === 'A-Z' ? 0 : 1);

  const pageGames = games;
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;
  const hasNoResults = !loading && totalResults === 0;

  const handleApplyFilters = () => {
    setSelectedGenres(tempSelectedGenres);
    setSelectedAccessibility(tempSelectedAccessibility);
    setReleaseYear(tempReleaseYear);
    setSortBy(tempSortBy);
    setIsFiltersOpen(false);
    if (currentPage !== 1) {
      onPageChange(1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearAll = () => {
    setTempSelectedGenres([]);
    setTempSelectedAccessibility([]);
    setTempReleaseYear('Any Year');
    setTempSortBy('A-Z');
    setSelectedGenres([]);
    setSelectedAccessibility([]);
    setReleaseYear('Any Year');
    setSortBy('A-Z');
    if (currentPage !== 1) {
      onPageChange(1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeAccessibility = (tag: string) => {
    setSelectedAccessibility(prev => prev.filter(t => t !== tag));
  };

  const hasActiveFilters = appliedFilterCount > 0;

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
              {selectedGenres.map(genre => (
                <button
                  key={`genre-${genre}`}
                  type="button"
                  className="browse-page__active-chip"
                  onClick={() => setSelectedGenres(prev => prev.filter(g => g !== genre))}
                >
                  <span className="browse-page__active-chip-label">Genre: {genre}</span>
                  <span className="browse-page__active-chip-close" aria-hidden="true">
                    ×
                  </span>
                  <span className="sr-only">Remove genre filter {genre}</span>
                </button>
              ))}
              {selectedAccessibility.map(tag => (
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
        <p
          className="browse-page__page-indicator"
          aria-live="polite"
        >
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
            {(() => {
              const safePageGames = pageGames ?? [];
              return safePageGames.map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  isFavourite={favourites.has(game.id)}
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
                    onGameClick(game.id);
                  }}
                  onToggleFavourite={() => onToggleFavourite(game.id)}
                />
              ));
            })()}
          </section>

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Catalogue pagination">
              <button
                type="button"
                className="pagination__button"
                onClick={() => {
                  if (!isFirstPage) {
                    onPageChange(currentPage - 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={isFirstPage}
              >
                Previous
              </button>
              <ul className="pagination__list">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  const isCurrent = page === currentPage;
                  return (
                    <li key={page}>
                      <button
                        type="button"
                        className={
                          'pagination__number' + (isCurrent ? ' pagination__number--current' : '')
                        }
                        onClick={() => {
                          onPageChange(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        aria-current={isCurrent ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className="pagination__button"
                onClick={() => {
                  if (!isLastPage) {
                    onPageChange(currentPage + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={isLastPage}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}

      {/* Filters sidebar */}
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
                {(showAllGenres ? allGenres : allGenres.slice(0, 20)).map(genre => {
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
                  onClick={() => setShowAllGenres(prev => !prev)}
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
                {allAccessibility.map(tag => {
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
