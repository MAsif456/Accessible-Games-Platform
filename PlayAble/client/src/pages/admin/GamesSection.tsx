import React from 'react';
import type { GameDto } from '../../services/api';
import type { AdminGameReport } from '../../services/adminGameReportsService';
import Pagination from '../../components/ui/Pagination';

type GamesSubTab = 'games' | 'reported' | 'resolved';

interface GamesSectionProps {
  gamesSubTab: GamesSubTab;
  handleAddNewGame: () => void;
  gamesSearchTerm: string;
  setGamesSearchTerm: (value: string) => void;
  gamesError: string | null;
  gamesLoading: boolean;
  pageGames: GameDto[];
  gamesPage: number;
  setGamesPage: (page: number) => void;
  totalGamesPages: number;
  GAMES_PAGE_SIZE: number;
  handleManageGame: (game: GameDto) => void;
  gameReportsSearch: string;
  setGameReportsSearch: (value: string) => void;
  gameReportsError: string | null;
  gameReportsLoading: boolean;
  filteredGameReports: AdminGameReport[];
  paginatedGameReports: AdminGameReport[];
  gameReportsTotalPages: number;
  gameReportsPage: number;
  setGameReportsPage: (page: number) => void;
  formatGameIssueType: (report: AdminGameReport) => string;
  truncateDescription: (text: string, limit?: number) => string;
  formatDate: (date: string | Date) => string;
  openGameReportModal: (report: AdminGameReport, mode: 'reply' | 'view') => void;
  resolvedGameReportsSearch: string;
  setResolvedGameReportsSearch: (value: string) => void;
  resolvedGameReportsError: string | null;
  resolvedGameReportsLoading: boolean;
  filteredResolvedGameReports: AdminGameReport[];
  paginatedResolvedGameReports: AdminGameReport[];
  resolvedGameReportsTotalPages: number;
  resolvedGameReportsPage: number;
  setResolvedGameReportsPage: (page: number) => void;
}

const GamesSection: React.FC<GamesSectionProps> = ({
  gamesSubTab,
  handleAddNewGame,
  gamesSearchTerm,
  setGamesSearchTerm,
  gamesError,
  gamesLoading,
  pageGames,
  gamesPage,
  setGamesPage,
  totalGamesPages,
  GAMES_PAGE_SIZE,
  handleManageGame,
  gameReportsSearch,
  setGameReportsSearch,
  gameReportsError,
  gameReportsLoading,
  filteredGameReports,
  paginatedGameReports,
  gameReportsTotalPages,
  gameReportsPage,
  setGameReportsPage,
  formatGameIssueType,
  truncateDescription,
  formatDate,
  openGameReportModal,
  resolvedGameReportsSearch,
  setResolvedGameReportsSearch,
  resolvedGameReportsError,
  resolvedGameReportsLoading,
  filteredResolvedGameReports,
  paginatedResolvedGameReports,
  resolvedGameReportsTotalPages,
  resolvedGameReportsPage,
  setResolvedGameReportsPage,
}) => {
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
                pageGames.map((game, index) => {
                  const id = game.id || game._id;
                  const displayIndex = (gamesPage - 1) * GAMES_PAGE_SIZE + index + 1;
                  return (
                    <tr key={id || displayIndex}>
                      <td>{displayIndex}</td>
                      <td>{game.title}</td>
                      <td>
                        <span className="admin-badge admin-badge--status">Active</span>
                      </td>
                      <td className="admin-table__actions-cell">
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

        {totalGamesPages > 1 && (
          <div className="admin-pagination">
            <Pagination
              page={gamesPage}
              totalPages={totalGamesPages}
              onPageChange={setGamesPage}
              ariaLabel="Games pagination"
            />
          </div>
        )}
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
            value={gameReportsSearch}
            onChange={e => setGameReportsSearch(e.target.value)}
          />
        </div>

        {gameReportsError && (
          <div role="alert" className="admin-error-message">
            {gameReportsError}
          </div>
        )}

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
              {gameReportsLoading ? (
                <tr className="admin-table__empty-row">
                  <td colSpan={6}>
                    <p className="admin-table__empty-message">Loading reports...</p>
                  </td>
                </tr>
              ) : filteredGameReports.length === 0 ? (
                <tr className="admin-table__empty-row">
                  <td colSpan={6}>
                    <p className="admin-table__empty-message">No reported games</p>
                  </td>
                </tr>
              ) : (
                paginatedGameReports.map(report => (
                  <tr key={report.id}>
                    <td>{report.reportCode}</td>
                    <td>{report.gameTitle || 'Unknown game'}</td>
                    <td>
                      <span className="admin-badge admin-badge--issue">
                        {formatGameIssueType(report)}
                      </span>
                    </td>
                    <td>{truncateDescription(report.description)}</td>
                    <td>{formatDate(report.createdAt)}</td>
                    <td className="admin-table__actions-cell">
                      <button
                        type="button"
                        className="admin-table__action-button"
                        onClick={() => openGameReportModal(report, 'reply')}
                      >
                        Reply
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {gameReportsTotalPages > 1 && (
          <div className="admin-pagination">
            <Pagination
              page={gameReportsPage}
              totalPages={gameReportsTotalPages}
              onPageChange={setGameReportsPage}
              ariaLabel="Reported game issues pagination"
            />
          </div>
        )}
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
          value={resolvedGameReportsSearch}
          onChange={e => setResolvedGameReportsSearch(e.target.value)}
        />
      </div>

      {resolvedGameReportsError && (
        <div role="alert" className="admin-error-message">
          {resolvedGameReportsError}
        </div>
      )}

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
            {resolvedGameReportsLoading ? (
              <tr className="admin-table__empty-row">
                <td colSpan={6}>
                  <p className="admin-table__empty-message">Loading reports...</p>
                </td>
              </tr>
            ) : filteredResolvedGameReports.length === 0 ? (
              <tr className="admin-table__empty-row">
                <td colSpan={6}>
                  <p className="admin-table__empty-message">No resolved reported games</p>
                </td>
              </tr>
            ) : (
              paginatedResolvedGameReports.map(report => (
                <tr key={report.id}>
                  <td>{report.reportCode}</td>
                  <td>{report.gameTitle || 'Unknown game'}</td>
                  <td>
                    <span className="admin-badge admin-badge--status">
                      {formatGameIssueType(report)}
                    </span>
                  </td>
                  <td>
                    <p>{truncateDescription(report.description)}</p>
                    {report.resolvedAt && (
                      <p className="admin-table__meta">
                        Resolved {formatDate(report.resolvedAt)}
                        {report.resolvedByName ? ` by ${report.resolvedByName}` : ''}
                      </p>
                    )}
                  </td>
                  <td>
                    <div>
                      <span>{formatDate(report.createdAt)}</span>
                    </div>
                  </td>
                  <td className="admin-table__actions-cell">
                    <button
                      type="button"
                      className="admin-table__action-button"
                      onClick={() => openGameReportModal(report, 'view')}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {resolvedGameReportsTotalPages > 1 && (
        <div className="admin-pagination">
          <Pagination
            page={resolvedGameReportsPage}
            totalPages={resolvedGameReportsTotalPages}
            onPageChange={setResolvedGameReportsPage}
            ariaLabel="Resolved game issues pagination"
          />
        </div>
      )}
    </section>
  );
};

export default GamesSection;
