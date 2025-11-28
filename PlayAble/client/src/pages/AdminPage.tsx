import React, { useState, useEffect, useMemo } from 'react';
import type { GameDto } from '../services/api';
import { getAdminGames } from '../services/gamesAdminService';

const PRIMARY_TABS = ['general-reports', 'reviews', 'games'] as const;
type PrimaryTab = (typeof PRIMARY_TABS)[number];

const GENERAL_SUBTABS = ['general', 'resolved'] as const;
const REVIEWS_SUBTABS = ['reviews', 'reported', 'resolved'] as const;
const GAMES_SUBTABS = ['games', 'reported', 'resolved'] as const;

type GeneralSubTab = (typeof GENERAL_SUBTABS)[number];
type ReviewsSubTab = (typeof REVIEWS_SUBTABS)[number];
type GamesSubTab = (typeof GAMES_SUBTABS)[number];

interface AdminPageProps {
  onNavigate?: (path: string) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('general-reports');
  const [generalSubTab, setGeneralSubTab] = useState<GeneralSubTab>('general');
  const [reviewsSubTab, setReviewsSubTab] = useState<ReviewsSubTab>('reviews');
  const [gamesSubTab, setGamesSubTab] = useState<GamesSubTab>('games');

  const handlePrimaryKey = (e: React.KeyboardEvent<HTMLButtonElement>, tab: PrimaryTab) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setPrimaryTab(tab);
    }
  };

  // Games management state
  const [games, setGames] = useState<GameDto[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [gamesSearchTerm, setGamesSearchTerm] = useState('');
  const [gamesPage, setGamesPage] = useState(1);
  const [gamesStatsLoading, setGamesStatsLoading] = useState(true);
  const GAMES_PAGE_SIZE = 10;

  // Load games on initial mount so Total Games is populated immediately
  useEffect(() => {
    let isCancelled = false;
    setGamesStatsLoading(true);
    Promise.resolve(getAdminGames())
      .then(res => {
        if (!isCancelled) {
          const safeGames = (res && (res as any).games) || [];
          setGames(safeGames);
        }
      })
      .catch(err => {
        if (!isCancelled) {
          console.error('Failed to load admin games', err);
          setGamesError('Unable to load games. Please try again later.');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setGamesStatsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (primaryTab === 'games') {
      setGamesLoading(true);
      setGamesError(null);
      Promise.resolve(getAdminGames())
        .then(res => {
          const safeGames = (res && (res as any).games) || [];
          setGames(safeGames);
        })
        .catch(err => {
          console.error('Failed to load admin games', err);
          setGamesError('Unable to load games. Please try again later.');
        })
        .finally(() => setGamesLoading(false));
    }
  }, [primaryTab]);

  const filteredGames = useMemo(() => {
    const term = gamesSearchTerm.trim().toLowerCase();
    if (!term) return games;
    return games.filter(game => {
      const id = game.id || game._id || '';
      return (
        game.title.toLowerCase().includes(term) ||
        id.toLowerCase().includes(term) ||
        game.slug.toLowerCase().includes(term)
      );
    });
  }, [games, gamesSearchTerm]);

  const totalGamesPages = Math.max(1, Math.ceil(filteredGames.length / GAMES_PAGE_SIZE));

  const pageGames = useMemo(() => {
    const start = (gamesPage - 1) * GAMES_PAGE_SIZE;
    return filteredGames.slice(start, start + GAMES_PAGE_SIZE);
  }, [filteredGames, gamesPage]);

  useEffect(() => {
    setGamesPage(1);
  }, [gamesSearchTerm]);

  const handleAddNewGame = () => {
    if (onNavigate) {
      onNavigate('/admin/games/new');
    }
  };

  const handleManageGame = (game: GameDto) => {
    if (onNavigate) {
      const id = game.id || game._id;
      if (id) {
        onNavigate(`/admin/games/${id}`);
      }
    }
  };

  const renderGeneralReportsSection = () => {
    const isResolved = generalSubTab === 'resolved';
    return (
      <section
        className="admin-section-card"
        aria-labelledby={isResolved ? 'general-resolved-title' : 'general-open-title'}
      >
        <header className="admin-section-card__header">
          <div>
            <h2 id={isResolved ? 'general-resolved-title' : 'general-open-title'}>
              {isResolved ? 'Resolved Reports' : 'General Reports'}
            </h2>
            <p className="admin-section-card__description">
              {isResolved
                ? 'Reports that have been resolved by administrators.'
                : "Open and unresolved reports submitted through the footer 'Report anything to us here' link"}
            </p>
          </div>
        </header>

        <div className="admin-section-card__search-wrapper">
          <label htmlFor="general-reports-search" className="sr-only">
            Search general reports
          </label>
          <input
            id="general-reports-search"
            type="search"
            className="admin-section-card__search-input"
            placeholder="Search by description, ID, or status..."
          />
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table" aria-label={isResolved ? 'Resolved reports table' : 'General reports table'}>
            <caption className="sr-only">
              {isResolved ? 'Resolved content reports' : 'Open general content reports'}
            </caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Description</th>
                <th scope="col">Reported By</th>
                <th scope="col">Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="admin-table__empty-row">
                <td colSpan={5}>
                  <p className="admin-table__empty-message">
                    {isResolved ? 'No resolved reports' : 'No general reports'}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderReviewsSection = () => {
    if (reviewsSubTab === 'reviews') {
      return (
        <section className="admin-section-card" aria-labelledby="reviews-title">
          <header className="admin-section-card__header">
            <div>
              <h2 id="reviews-title">Reviews Management</h2>
              <p className="admin-section-card__description">
                Moderate and manage user-submitted accessibility reviews.
              </p>
            </div>
          </header>

          <div className="admin-section-card__search-wrapper">
            <label htmlFor="reviews-search" className="sr-only">
              Search reviews
            </label>
            <input
              id="reviews-search"
              type="search"
              className="admin-section-card__search-input"
              placeholder="Search by game, author, comment, or ID..."
            />
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table" aria-label="Reviews management table">
              <caption className="sr-only">User-submitted accessibility reviews</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Game</th>
                  <th scope="col">Author</th>
                  <th scope="col">Comment</th>
                  <th scope="col">Date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="admin-table__empty-row">
                  <td colSpan={6}>
                    <p className="admin-table__empty-message">No reviews</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    if (reviewsSubTab === 'reported') {
      return (
        <section className="admin-section-card" aria-labelledby="reported-reviews-title">
          <header className="admin-section-card__header">
            <div>
              <h2 id="reported-reviews-title">Reported Reviews</h2>
              <p className="admin-section-card__description">
                Reviews that have been reported by users and require moderation.
              </p>
            </div>
          </header>

          <div className="admin-section-card__search-wrapper">
            <label htmlFor="reported-reviews-search" className="sr-only">
              Search reported reviews
            </label>
            <input
              id="reported-reviews-search"
              type="search"
              className="admin-section-card__search-input"
              placeholder="Search by game, author, or reason..."
            />
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table" aria-label="Reported reviews table">
              <caption className="sr-only">Reported reviews requiring moderation</caption>
              <thead>
                <tr>
                  <th scope="col">Report ID</th>
                  <th scope="col">Game</th>
                  <th scope="col">Review Author</th>
                  <th scope="col">Report Reason</th>
                  <th scope="col">Reported Date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="admin-table__empty-row">
                  <td colSpan={6}>
                    <p className="admin-table__empty-message">No reported reviews</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    return (
      <section className="admin-section-card" aria-labelledby="resolved-reviews-title">
        <header className="admin-section-card__header">
          <div>
            <h2 id="resolved-reviews-title">Resolved Reported Reviews</h2>
            <p className="admin-section-card__description">
              Resolved reports for reviews that have been addressed by administrators.
            </p>
          </div>
        </header>

        <div className="admin-section-card__search-wrapper">
          <label htmlFor="resolved-reviews-search" className="sr-only">
            Search resolved reported reviews
          </label>
          <input
            id="resolved-reviews-search"
            type="search"
            className="admin-section-card__search-input"
            placeholder="Search by game, author, or reason..."
          />
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table" aria-label="Resolved reported reviews table">
            <caption className="sr-only">Resolved reports for previously reported reviews</caption>
            <thead>
              <tr>
                <th scope="col">Report ID</th>
                <th scope="col">Game</th>
                <th scope="col">Review Author</th>
                <th scope="col">Report Reason</th>
                <th scope="col">Reported Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="admin-table__empty-row">
                <td colSpan={6}>
                  <p className="admin-table__empty-message">No resolved reported reviews</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderGamesSection = () => {
    if (gamesSubTab === 'games') {
      return (
        <section className="admin-section-card" aria-labelledby="games-management-title">
          <header className="admin-section-card__header admin-section-card__header--with-action">
            <div>
              <h2 id="games-management-title">Games Management</h2>
              <p className="admin-section-card__description">Manage games in the platform catalog.</p>
            </div>
            <button type="button" className="admin-primary-button" onClick={handleAddNewGame}>
              <span>+ Add New Game</span>
            </button>
          </header>

          <div className="admin-section-card__search-wrapper">
            <label htmlFor="games-search" className="sr-only">
              Search games
            </label>
            <input
              id="games-search"
              type="search"
              className="admin-section-card__search-input"
              placeholder="Search by game title or ID..."
              value={gamesSearchTerm}
              onChange={e => setGamesSearchTerm(e.target.value)}
            />
          </div>

          {gamesError && (
            <div role="alert" className="admin-error-message">
              {gamesError}
            </div>
          )}

          <div className="admin-table-wrapper">
            <table className="admin-table" aria-label="Games management table">
              <caption className="sr-only">Platform games catalogue</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Game Title</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {gamesLoading ? (
                  <tr className="admin-table__empty-row">
                    <td colSpan={4}>
                      <p className="admin-table__empty-message">Loading games...</p>
                    </td>
                  </tr>
                ) : pageGames.length === 0 ? (
                  <tr className="admin-table__empty-row">
                    <td colSpan={4}>
                      <p className="admin-table__empty-message">No games in catalog</p>
                    </td>
                  </tr>
                ) : (
                  pageGames.map(game => {
                    const id = game.id || game._id;
                    return (
                      <tr key={id}>
                        <td>{id}</td>
                        <td>{game.title}</td>
                        <td>
                          <span className="admin-badge admin-badge--status">Active</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-table__action-button"
                            onClick={() => handleManageGame(game)}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <nav className="admin-pagination" aria-label="Games pagination">
            <button
              type="button"
              className="admin-pagination__button"
              onClick={() => setGamesPage(p => Math.max(1, p - 1))}
              disabled={gamesPage === 1}
            >
              Previous
            </button>
            <ol className="admin-pagination__list">
              <li>
                <button
                  type="button"
                  className="admin-pagination__page admin-pagination__page--current"
                  aria-current="page"
                >
                  {gamesPage}
                </button>
              </li>
            </ol>
            <button
              type="button"
              className="admin-pagination__button"
              onClick={() => setGamesPage(p => Math.min(totalGamesPages, p + 1))}
              disabled={gamesPage === totalGamesPages}
            >
              Next
            </button>
          </nav>
        </section>
      );
    }

    if (gamesSubTab === 'reported') {
      return (
        <section className="admin-section-card" aria-labelledby="reported-games-title">
          <header className="admin-section-card__header">
            <div>
              <h2 id="reported-games-title">Reported Games</h2>
              <p className="admin-section-card__description">
                Game-related issues reported by users requiring admin attention.
              </p>
            </div>
          </header>

          <div className="admin-section-card__search-wrapper">
            <label htmlFor="reported-games-search" className="sr-only">
              Search reported games
            </label>
            <input
              id="reported-games-search"
              type="search"
              className="admin-section-card__search-input"
              placeholder="Search by game, issue type, or description..."
            />
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table" aria-label="Reported games table">
              <caption className="sr-only">Reported game issues requiring attention</caption>
              <thead>
                <tr>
                  <th scope="col">Report ID</th>
                  <th scope="col">Game</th>
                  <th scope="col">Issue Type</th>
                  <th scope="col">Description</th>
                  <th scope="col">Reported Date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="admin-table__empty-row">
                  <td colSpan={6}>
                    <p className="admin-table__empty-message">No reported games</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    return (
      <section className="admin-section-card" aria-labelledby="resolved-games-title">
        <header className="admin-section-card__header">
          <div>
            <h2 id="resolved-games-title">Resolved Reported Games</h2>
            <p className="admin-section-card__description">
              Game reports that have been resolved by administrators.
            </p>
          </div>
        </header>

        <div className="admin-section-card__search-wrapper">
          <label htmlFor="resolved-games-search" className="sr-only">
            Search resolved reported games
          </label>
          <input
            id="resolved-games-search"
            type="search"
            className="admin-section-card__search-input"
            placeholder="Search by game, issue type, or description..."
          />
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table" aria-label="Resolved reported games table">
            <caption className="sr-only">Resolved game issue reports</caption>
            <thead>
              <tr>
                <th scope="col">Report ID</th>
                <th scope="col">Game</th>
                <th scope="col">Issue Type</th>
                <th scope="col">Description</th>
                <th scope="col">Reported Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="admin-table__empty-row">
                <td colSpan={6}>
                  <p className="admin-table__empty-message">No resolved reported games</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  return (
    <main className="admin-page" aria-label="Admin Management dashboard">
      <header className="admin-page__header">
        <div className="admin-page__title-row">
          <span className="admin-icon admin-icon--shield" aria-hidden="true" />
          <div>
            <h1 className="admin-page__title">Admin Management</h1>
            <p className="admin-page__subtitle">Content moderation and platform management</p>
          </div>
        </div>

        <section className="admin-stats" aria-label="Platform statistics">
          <article className="admin-stat-card" aria-label="Total games statistic">
            <div className="admin-stat-card__header">
              <h2 className="admin-stat-card__title">Total Games</h2>
            </div>
            <p
              className={
                'admin-stat-card__value' + (gamesStatsLoading ? ' admin-stat-card__value--skeleton' : '')
              }
              aria-label={
                gamesStatsLoading
                  ? 'Loading catalogued games count'
                  : `${games.length} catalogued games`
              }
            >
              {gamesStatsLoading ? '—' : games.length}
            </p>
            <p className="admin-stat-card__meta">Catalogued games</p>
          </article>
          <article className="admin-stat-card" aria-label="General reports statistic">
            <div className="admin-stat-card__header">
              <h2 className="admin-stat-card__title">General Reports</h2>
            </div>
            <p className="admin-stat-card__value" aria-label="2 general reports require attention">
              2
            </p>
            <p className="admin-stat-card__meta">Require attention</p>
          </article>
          <article className="admin-stat-card" aria-label="Active reviews statistic">
            <div className="admin-stat-card__header">
              <h2 className="admin-stat-card__title">Active Reviews</h2>
            </div>
            <p className="admin-stat-card__value" aria-label="4 published reviews">
              4
            </p>
            <p className="admin-stat-card__meta">Published reviews</p>
          </article>
        </section>
      </header>

      <section className="admin-tabs" aria-label="Admin sections">
        <div role="tablist" aria-label="Admin primary tabs" className="admin-tabs__list">
          <button
            type="button"
            role="tab"
            aria-selected={primaryTab === 'general-reports'}
            aria-controls="admin-tabpanel-general"
            id="admin-tab-general"
            tabIndex={primaryTab === 'general-reports' ? 0 : -1}
            className={
              'admin-tabs__tab' + (primaryTab === 'general-reports' ? ' admin-tabs__tab--active' : '')
            }
            onClick={() => setPrimaryTab('general-reports')}
            onKeyDown={e => handlePrimaryKey(e, 'general-reports')}
          >
            General Reports
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={primaryTab === 'reviews'}
            aria-controls="admin-tabpanel-reviews"
            id="admin-tab-reviews"
            tabIndex={primaryTab === 'reviews' ? 0 : -1}
            className={
              'admin-tabs__tab' + (primaryTab === 'reviews' ? ' admin-tabs__tab--active' : '')
            }
            onClick={() => setPrimaryTab('reviews')}
            onKeyDown={e => handlePrimaryKey(e, 'reviews')}
          >
            Reviews Management
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={primaryTab === 'games'}
            aria-controls="admin-tabpanel-games"
            id="admin-tab-games"
            tabIndex={primaryTab === 'games' ? 0 : -1}
            className={
              'admin-tabs__tab' + (primaryTab === 'games' ? ' admin-tabs__tab--active' : '')
            }
            onClick={() => setPrimaryTab('games')}
            onKeyDown={e => handlePrimaryKey(e, 'games')}
          >
            Games Management
          </button>
        </div>
      </section>

      {primaryTab === 'general-reports' && (
        <section
          id="admin-tabpanel-general"
          role="tabpanel"
          aria-labelledby="admin-tab-general"
          className="admin-tabpanel"
        >
          <div className="admin-subtabs" role="tablist" aria-label="General reports sub tabs">
            <button
              type="button"
              role="tab"
              aria-selected={generalSubTab === 'general'}
              tabIndex={generalSubTab === 'general' ? 0 : -1}
              className={
                'admin-subtabs__tab' + (generalSubTab === 'general' ? ' admin-subtabs__tab--active' : '')
              }
              onClick={() => setGeneralSubTab('general')}
            >
              General Reports
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={generalSubTab === 'resolved'}
              tabIndex={generalSubTab === 'resolved' ? 0 : -1}
              className={
                'admin-subtabs__tab' + (generalSubTab === 'resolved' ? ' admin-subtabs__tab--active' : '')
              }
              onClick={() => setGeneralSubTab('resolved')}
            >
              Resolved Reports
            </button>
          </div>
          {renderGeneralReportsSection()}
        </section>
      )}

      {primaryTab === 'reviews' && (
        <section
          id="admin-tabpanel-reviews"
          role="tabpanel"
          aria-labelledby="admin-tab-reviews"
          className="admin-tabpanel"
        >
          <div className="admin-subtabs" role="tablist" aria-label="Reviews management sub tabs">
            <button
              type="button"
              role="tab"
              aria-selected={reviewsSubTab === 'reviews'}
              tabIndex={reviewsSubTab === 'reviews' ? 0 : -1}
              className={
                'admin-subtabs__tab' + (reviewsSubTab === 'reviews' ? ' admin-subtabs__tab--active' : '')
              }
              onClick={() => setReviewsSubTab('reviews')}
            >
              Reviews
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={reviewsSubTab === 'reported'}
              tabIndex={reviewsSubTab === 'reported' ? 0 : -1}
              className={
                'admin-subtabs__tab' + (reviewsSubTab === 'reported' ? ' admin-subtabs__tab--active' : '')
              }
              onClick={() => setReviewsSubTab('reported')}
            >
              Reported Reviews
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={reviewsSubTab === 'resolved'}
              tabIndex={reviewsSubTab === 'resolved' ? 0 : -1}
              className={
                'admin-subtabs__tab' + (reviewsSubTab === 'resolved' ? ' admin-subtabs__tab--active' : '')
              }
              onClick={() => setReviewsSubTab('resolved')}
            >
              Resolved Reported Reviews
            </button>
          </div>
          {renderReviewsSection()}
        </section>
      )}

      {primaryTab === 'games' && (
        <section
          id="admin-tabpanel-games"
          role="tabpanel"
          aria-labelledby="admin-tab-games"
          className="admin-tabpanel"
        >
          <div className="admin-subtabs" role="tablist" aria-label="Games management sub tabs">
            <button
              type="button"
              role="tab"
              aria-selected={gamesSubTab === 'games'}
              tabIndex={gamesSubTab === 'games' ? 0 : -1}
              className={
                'admin-subtabs__tab' + (gamesSubTab === 'games' ? ' admin-subtabs__tab--active' : '')
              }
              onClick={() => setGamesSubTab('games')}
            >
              Games
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={gamesSubTab === 'reported'}
              tabIndex={gamesSubTab === 'reported' ? 0 : -1}
              className={
                'admin-subtabs__tab' + (gamesSubTab === 'reported' ? ' admin-subtabs__tab--active' : '')
              }
              onClick={() => setGamesSubTab('reported')}
            >
              Reported Games
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={gamesSubTab === 'resolved'}
              tabIndex={gamesSubTab === 'resolved' ? 0 : -1}
              className={
                'admin-subtabs__tab' + (gamesSubTab === 'resolved' ? ' admin-subtabs__tab--active' : '')
              }
              onClick={() => setGamesSubTab('resolved')}
            >
              Resolved Reported Games
            </button>
          </div>
          {renderGamesSection()}
        </section>
      )}
    </main>
  );
};

export default AdminPage;
