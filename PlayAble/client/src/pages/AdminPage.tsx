import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { GameDto } from '../services/api';
import { getReviewStats } from '../services/api';
import type { AdminResolvedReviewReport } from '../services/adminReviewsService';
import {
  AdminGeneralReport,
  fetchGeneralReports,
  formatReportCode,
  replyToGeneralReport,
} from '../services/adminReportsService';
import {
  AdminGameReport,
  fetchGameReports as fetchAdminGameReports,
  replyToGameReport,
} from '../services/adminGameReportsService';
import { getAdminGames } from '../services/gamesAdminService';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import { useReviewsTable, useReportedReviewsTable, useResolvedReportedReviewsTable } from '../hooks/adminReviews';
import useAdminReviewActions, { ADMIN_REPLY_MIN_CHARS, ADMIN_REPLY_MAX_CHARS } from '../hooks/useAdminReviewActions';

// Consistent date formatting function for tests and display
/**
 * Formats a date string or Date object into DD/MM/YYYY for table readability and stable tests.
 */
const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

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
  showPrompt?: (message: string, type?: 'success' | 'error') => void;
}

/**
 * AdminPage brings together the admin dashboards (reports, reviews, games) with shared pagination,
 * filtering, and modal management.
 */
const AdminPage: React.FC<AdminPageProps> = ({ onNavigate, showPrompt }) => {
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('general-reports');
  const [generalSubTab, setGeneralSubTab] = useState<GeneralSubTab>('general');
  const [reviewsSubTab, setReviewsSubTab] = useState<ReviewsSubTab>('reviews');
  const [gamesSubTab, setGamesSubTab] = useState<GamesSubTab>('games');
  const [activeReviewsCount, setActiveReviewsCount] = useState<number | null>(null);
  const [loadingActiveReviews, setLoadingActiveReviews] = useState(false);
  const [activeReviewsError, setActiveReviewsError] = useState<string | null>(null);

  const refreshActiveReviews = useCallback(() => {
    let isMounted = true;
    setLoadingActiveReviews(true);
    setActiveReviewsError(null);

    Promise.resolve(getReviewStats())
      .then(result => {
        if (!isMounted) return;
        const total = result?.totalReviews;
        if (typeof total === 'number') {
          setActiveReviewsCount(total);
        } else {
          setActiveReviewsError('Unable to load review count');
          setActiveReviewsCount(null);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setActiveReviewsError('Unable to load review count');
        setActiveReviewsCount(null);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingActiveReviews(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    refreshActiveReviews();
  }, [refreshActiveReviews]);
  const activeReviewsAriaLabel = loadingActiveReviews
    ? 'Loading active reviews'
    : activeReviewsCount === null
      ? 'Active reviews count unavailable'
      : `${activeReviewsCount} published reviews`;

  // Reviews management state via hooks
  const reviewsTable = useReviewsTable();
  const reportedTable = useReportedReviewsTable();
  const resolvedTable = useResolvedReportedReviewsTable();

  const {
    deleteReview,
    sendAdminReply,
    resolveReportedReview,
    error: adminActionsError,
  } = useAdminReviewActions({

    showToast: showPrompt,
    onRefreshReviews: reviewsTable.refresh,
    onRefreshReported: reportedTable.refresh,
    onRefreshResolved: resolvedTable.refresh,
    onRefreshStats: refreshActiveReviews,
  });

  // Local modal state
  const [reviewToDelete, setReviewToDelete] = useState<null | { id: string; displayId?: string; authorName?: string }>(null);
  const [reviewToReply, setReviewToReply] = useState<null | any>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [reportToResolve, setReportToResolve] = useState<null | any>(null);
  const [moderatorReply, setModeratorReply] = useState('');
  const [moderatorReplyError, setModeratorReplyError] = useState<string | null>(null);
  const [resolveConfirmAction, setResolveConfirmAction] = useState<null | { action: 'complete' | 'delete-review'; report: any }>(null);
  const [resolvedReportToView, setResolvedReportToView] = useState<AdminResolvedReviewReport | null>(null);

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

  // General reports state
  const [generalReports, setGeneralReports] = useState<AdminGeneralReport[]>([]);
  const [resolvedGeneralReports, setResolvedGeneralReports] = useState<AdminGeneralReport[]>([]);
  const [generalReportsLoading, setGeneralReportsLoading] = useState(false);
  const [resolvedReportsLoading, setResolvedReportsLoading] = useState(false);
  const [generalReportsError, setGeneralReportsError] = useState<string | null>(null);
  const [resolvedReportsError, setResolvedReportsError] = useState<string | null>(null);
  const [generalReportsSearch, setGeneralReportsSearch] = useState('');
  const [resolvedReportsSearch, setResolvedReportsSearch] = useState('');
  const [generalReportsPage, setGeneralReportsPage] = useState(1);
  const [resolvedGeneralReportsPage, setResolvedGeneralReportsPage] = useState(1);
  const GENERAL_REPORTS_PAGE_SIZE = 10;
  const [activeReport, setActiveReport] = useState<AdminGeneralReport | null>(null);
  const [reportModalMode, setReportModalMode] = useState<'reply' | 'view'>('reply');
  const [reportReplyMessage, setReportReplyMessage] = useState('');
  const [reportModalError, setReportModalError] = useState<string | null>(null);
  const [reportModalSubmitting, setReportModalSubmitting] = useState(false);

  // Game reports state
  const [gameReports, setGameReports] = useState<AdminGameReport[]>([]);
  const [resolvedGameReports, setResolvedGameReports] = useState<AdminGameReport[]>([]);
  const [gameReportsLoading, setGameReportsLoading] = useState(false);
  const [resolvedGameReportsLoading, setResolvedGameReportsLoading] = useState(false);
  const [gameReportsError, setGameReportsError] = useState<string | null>(null);
  const [resolvedGameReportsError, setResolvedGameReportsError] = useState<string | null>(null);
  const [gameReportsSearch, setGameReportsSearch] = useState('');
  const [resolvedGameReportsSearch, setResolvedGameReportsSearch] = useState('');
  const [gameReportsPage, setGameReportsPage] = useState(1);
  const [resolvedGameReportsPage, setResolvedGameReportsPage] = useState(1);
  const GAME_REPORTS_PAGE_SIZE = 10;
  const [activeGameReport, setActiveGameReport] = useState<AdminGameReport | null>(null);
  const [gameReportModalMode, setGameReportModalMode] = useState<'reply' | 'view'>('reply');
  const [gameReportReplyMessage, setGameReportReplyMessage] = useState('');
  const [gameReportModalError, setGameReportModalError] = useState<string | null>(null);
  const [gameReportModalSubmitting, setGameReportModalSubmitting] = useState(false);

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
    const safeGames = games || [];
    const term = gamesSearchTerm.trim().toLowerCase();
    if (!term) return safeGames;
    return safeGames.filter(game => {
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
  }, [GAMES_PAGE_SIZE, filteredGames, gamesPage]);

  useEffect(() => {
    setGamesPage(1);
  }, [gamesSearchTerm]);

  useEffect(() => {
    if (gamesPage > totalGamesPages) {
      setGamesPage(totalGamesPages);
    }
  }, [gamesPage, totalGamesPages]);

  const loadGeneralReports = useCallback(async () => {
    setGeneralReportsLoading(true);
    setGeneralReportsError(null);
    try {
      const reports = await fetchGeneralReports('open');
      setGeneralReports(reports);
    } catch (err) {
      console.error('Failed to load general reports', err);
      setGeneralReportsError('Unable to load general reports. Please try again later.');
    } finally {
      setGeneralReportsLoading(false);
    }
  }, []);

  /**
   * Retrieves resolved general reports to populate the Resolved tab.
   */
  const loadResolvedReports = useCallback(async () => {
    setResolvedReportsLoading(true);
    setResolvedReportsError(null);
    try {
      const reports = await fetchGeneralReports('resolved');
      setResolvedGeneralReports(reports);
    } catch (err) {
      console.error('Failed to load resolved reports', err);
      setResolvedReportsError('Unable to load resolved reports. Please try again later.');
    } finally {
      setResolvedReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGeneralReports();
    loadResolvedReports();
  }, [loadGeneralReports, loadResolvedReports]);

  /**
   * Fetches open game-related reports for the Reported Games tab.
   */
  const loadGameReports = useCallback(async () => {
    setGameReportsLoading(true);
    setGameReportsError(null);
    try {
      const reports = await fetchAdminGameReports('open');
      setGameReports(reports);
    } catch (error) {
      console.error('Failed to load game reports', error);
      setGameReportsError('Unable to load game reports. Please try again later.');
    } finally {
      setGameReportsLoading(false);
    }
  }, []);

  /**
   * Fetches resolved game reports for the Resolved Reported Games tab.
   */
  const loadResolvedGameReports = useCallback(async () => {
    setResolvedGameReportsLoading(true);
    setResolvedGameReportsError(null);
    try {
      const reports = await fetchAdminGameReports('resolved');
      setResolvedGameReports(reports);
    } catch (error) {
      console.error('Failed to load resolved game reports', error);
      setResolvedGameReportsError('Unable to load resolved game reports. Please try again later.');
    } finally {
      setResolvedGameReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGameReports();
    loadResolvedGameReports();
  }, [loadGameReports, loadResolvedGameReports]);

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

  const formatReporter = (report: AdminGeneralReport) =>
    report.reporterName || report.reporterEmail || 'Anonymous user';
  const formatGameReportReporter = (report: AdminGameReport) =>
    report.reporterName || report.reporterEmail || 'Anonymous user';

  const truncateDescription = (text: string, limit = 90) => {
    if (!text) return 'No description provided.';
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  };

  const matchesReport = (report: AdminGeneralReport, term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return true;
    return (
      (report.reportCode || '').toLowerCase().includes(normalized) ||
      (report.description || '').toLowerCase().includes(normalized) ||
      (report.reporterEmail || '').toLowerCase().includes(normalized) ||
      (report.reporterName || '').toLowerCase().includes(normalized) ||
      report.status.toLowerCase().includes(normalized)
    );
  };

  const formatGameIssueType = (report: AdminGameReport) => report.issueType || 'Accessibility Issue';

  const matchesGameReport = (report: AdminGameReport, term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return true;
    return (
      (report.reportCode || '').toLowerCase().includes(normalized) ||
      (report.gameTitle || '').toLowerCase().includes(normalized) ||
      (report.issueType || '').toLowerCase().includes(normalized) ||
      (report.description || '').toLowerCase().includes(normalized) ||
      (report.reporterEmail || '').toLowerCase().includes(normalized) ||
      (report.reporterName || '').toLowerCase().includes(normalized)
    );
  };

  const filteredGeneralReports = useMemo(
    () => (generalReports || []).filter(report => matchesReport(report, generalReportsSearch)),
    [generalReports, generalReportsSearch]
  );

  const filteredResolvedReports = useMemo(
    () => (resolvedGeneralReports || []).filter(report => matchesReport(report, resolvedReportsSearch)),
    [resolvedGeneralReports, resolvedReportsSearch]
  );

  const filteredGameReports = useMemo(
    () => (gameReports || []).filter(report => matchesGameReport(report, gameReportsSearch)),
    [gameReports, gameReportsSearch]
  );

  const filteredResolvedGameReports = useMemo(
    () => (resolvedGameReports || []).filter(report => matchesGameReport(report, resolvedGameReportsSearch)),
    [resolvedGameReports, resolvedGameReportsSearch]
  );

  const generalReportsTotalPages = Math.max(
    1,
    Math.ceil(filteredGeneralReports.length / GENERAL_REPORTS_PAGE_SIZE)
  );
  const resolvedGeneralReportsTotalPages = Math.max(
    1,
    Math.ceil(filteredResolvedReports.length / GENERAL_REPORTS_PAGE_SIZE)
  );
  const paginatedGeneralReports = useMemo(() => {
    const start = (generalReportsPage - 1) * GENERAL_REPORTS_PAGE_SIZE;
    return filteredGeneralReports.slice(start, start + GENERAL_REPORTS_PAGE_SIZE);
  }, [GENERAL_REPORTS_PAGE_SIZE, filteredGeneralReports, generalReportsPage]);
  const paginatedResolvedGeneralReports = useMemo(() => {
    const start = (resolvedGeneralReportsPage - 1) * GENERAL_REPORTS_PAGE_SIZE;
    return filteredResolvedReports.slice(start, start + GENERAL_REPORTS_PAGE_SIZE);
  }, [GENERAL_REPORTS_PAGE_SIZE, filteredResolvedReports, resolvedGeneralReportsPage]);

  const gameReportsTotalPages = Math.max(1, Math.ceil(filteredGameReports.length / GAME_REPORTS_PAGE_SIZE));
  const resolvedGameReportsTotalPages = Math.max(
    1,
    Math.ceil(filteredResolvedGameReports.length / GAME_REPORTS_PAGE_SIZE)
  );
  const paginatedGameReports = useMemo(() => {
    const start = (gameReportsPage - 1) * GAME_REPORTS_PAGE_SIZE;
    return filteredGameReports.slice(start, start + GAME_REPORTS_PAGE_SIZE);
  }, [GAME_REPORTS_PAGE_SIZE, filteredGameReports, gameReportsPage]);
  const paginatedResolvedGameReports = useMemo(() => {
    const start = (resolvedGameReportsPage - 1) * GAME_REPORTS_PAGE_SIZE;
    return filteredResolvedGameReports.slice(start, start + GAME_REPORTS_PAGE_SIZE);
  }, [GAME_REPORTS_PAGE_SIZE, filteredResolvedGameReports, resolvedGameReportsPage]);

  useEffect(() => {
    setGeneralReportsPage(1);
  }, [generalReportsSearch]);

  useEffect(() => {
    setResolvedGeneralReportsPage(1);
  }, [resolvedReportsSearch]);

  useEffect(() => {
    setGameReportsPage(1);
  }, [gameReportsSearch]);

  useEffect(() => {
    setResolvedGameReportsPage(1);
  }, [resolvedGameReportsSearch]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredGeneralReports.length / GENERAL_REPORTS_PAGE_SIZE));
    if (generalReportsPage > maxPage) {
      setGeneralReportsPage(maxPage);
    }
  }, [GENERAL_REPORTS_PAGE_SIZE, filteredGeneralReports.length, generalReportsPage]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredResolvedReports.length / GENERAL_REPORTS_PAGE_SIZE));
    if (resolvedGeneralReportsPage > maxPage) {
      setResolvedGeneralReportsPage(maxPage);
    }
  }, [GENERAL_REPORTS_PAGE_SIZE, filteredResolvedReports.length, resolvedGeneralReportsPage]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredGameReports.length / GAME_REPORTS_PAGE_SIZE));
    if (gameReportsPage > maxPage) {
      setGameReportsPage(maxPage);
    }
  }, [GAME_REPORTS_PAGE_SIZE, filteredGameReports.length, gameReportsPage]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredResolvedGameReports.length / GAME_REPORTS_PAGE_SIZE));
    if (resolvedGameReportsPage > maxPage) {
      setResolvedGameReportsPage(maxPage);
    }
  }, [GAME_REPORTS_PAGE_SIZE, filteredResolvedGameReports.length, resolvedGameReportsPage]);

  const closeReportModal = () => {
    setActiveReport(null);
    setReportReplyMessage('');
    setReportModalError(null);
    setReportModalSubmitting(false);
  };

  const openReportModal = (report: AdminGeneralReport, mode: 'reply' | 'view') => {
    setActiveReport(report);
    setReportModalMode(mode);
    setReportReplyMessage('');
    setReportModalError(null);
  };

  const handleReportReplySubmit = async () => {
    if (!activeReport) return;
    const trimmed = reportReplyMessage.trim();
    if (!trimmed) {
      setReportModalError('Please enter a reply to send to the reporter.');
      return;
    }
    setReportModalSubmitting(true);
    setReportModalError(null);
    try {
      const updated = await replyToGeneralReport(activeReport.id, trimmed);
      setGeneralReports(prev => prev.filter(report => report.id !== updated.id));
      setResolvedGeneralReports(prev => [updated, ...prev]);
      closeReportModal();
      loadGeneralReports();
      loadResolvedReports();
      showPrompt?.('Reply sent and report resolved.', 'success');
    } catch (err) {
      console.error('Failed to send reply', err);
      setReportModalError('Failed to send reply. Please try again.');
      setReportModalSubmitting(false);
    }
  };

  const closeGameReportModal = () => {
    setActiveGameReport(null);
    setGameReportReplyMessage('');
    setGameReportModalError(null);
    setGameReportModalSubmitting(false);
  };

  const openGameReportModal = (report: AdminGameReport, mode: 'reply' | 'view') => {
    setActiveGameReport(report);
    setGameReportModalMode(mode);
    setGameReportReplyMessage('');
    setGameReportModalError(null);
  };

  const handleGameReportReplySubmit = async () => {
    if (!activeGameReport) return;
    const trimmed = gameReportReplyMessage.trim();
    if (!trimmed) {
      setGameReportModalError('Please enter a reply to send to the reporter.');
      return;
    }
    setGameReportModalSubmitting(true);
    setGameReportModalError(null);
    try {
      const updated = await replyToGameReport(activeGameReport.id, trimmed);
      setGameReports(prev => prev.filter(report => report.id !== updated.id));
      setResolvedGameReports(prev => [updated, ...prev.filter(report => report.id !== updated.id)]);
      closeGameReportModal();
      loadGameReports();
      loadResolvedGameReports();
      showPrompt?.('Reply sent and game report resolved.', 'success');
    } catch (error) {
      console.error('Failed to reply to game report', error);
      setGameReportModalError('Failed to send reply. Please try again.');
      setGameReportModalSubmitting(false);
    }
  };

  const renderGeneralReportsSection = () => {
    const isResolved = generalSubTab === 'resolved';
    const reports = isResolved ? paginatedResolvedGeneralReports : paginatedGeneralReports;
    const loading = isResolved ? resolvedReportsLoading : generalReportsLoading;
    const error = isResolved ? resolvedReportsError : generalReportsError;
    const searchValue = isResolved ? resolvedReportsSearch : generalReportsSearch;
    const handleSearch = isResolved ? setResolvedReportsSearch : setGeneralReportsSearch;
    const searchInputId = isResolved ? 'resolved-reports-search' : 'general-reports-search';
    const dateLabel = isResolved ? 'Resolved On' : 'Date';
    const totalPages = isResolved ? resolvedGeneralReportsTotalPages : generalReportsTotalPages;
    const currentPage = isResolved ? resolvedGeneralReportsPage : generalReportsPage;
    const onPageChange = isResolved ? setResolvedGeneralReportsPage : setGeneralReportsPage;

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
          <label htmlFor={searchInputId} className="sr-only">
            Search general reports
          </label>
          <input
            id={searchInputId}
            type="search"
            className="admin-section-card__search-input"
            placeholder="Search by description, ID, or reporter..."
            value={searchValue}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {error && (
          <div role="alert" className="admin-error-message">
            {error}
          </div>
        )}

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
                <th scope="col">{dateLabel}</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="admin-table__empty-row">
                  <td colSpan={5}>
                    <p className="admin-table__empty-message">Loading reports...</p>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr className="admin-table__empty-row">
                  <td colSpan={5}>
                    <p className="admin-table__empty-message">
                      {isResolved ? 'No resolved reports' : 'No general reports'}
                    </p>
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id}>
                    <td>{formatReportCode(report)}</td>
                    <td>{truncateDescription(report.description)}</td>
                    <td>{formatReporter(report)}</td>
                    <td>
                      {formatDate(
                        isResolved && report.resolvedAt ? report.resolvedAt : report.createdAt
                      )}
                    </td>
                    <td className="admin-table__actions-cell">
                      <button
                        type="button"
                        className="admin-table__action-button"
                        onClick={() => openReportModal(report, isResolved ? 'view' : 'reply')}
                      >
                        {isResolved ? 'View' : 'Reply'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="admin-pagination">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              ariaLabel={isResolved ? 'Resolved general reports pagination' : 'General reports pagination'}
            />
          </div>
        )}
      </section>
    );
  };

  const renderReviewsSection = () => {
    const confirmResolveModal = (
      <Modal
        isOpen={!!resolveConfirmAction}
        titleId="confirm-resolve-title"
        onClose={() => setResolveConfirmAction(null)}
        contentClassName="modal-content--wide"
      >
        {resolveConfirmAction && (
          <div>
            <h2 id="confirm-resolve-title" className="dialog__title">
              {resolveConfirmAction.action === 'complete' ? 'Complete Report' : 'Delete Review'}
            </h2>
            <p className="dialog__message">
              {resolveConfirmAction.action === 'complete'
                ? 'Are you sure you want to complete this report and keep the review live?'
                : 'Are you sure you want to delete this review as part of resolving the report?'}
            </p>
            <div className="dialog__actions dialog__actions--split">
              <button
                type="button"
                className="dialog__button dialog__button--secondary"
                onClick={() => setResolveConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  resolveConfirmAction.action === 'complete'
                    ? 'dialog__button dialog__button--contrast'
                    : 'dialog__button dialog__button--primary'
                }
                onClick={async () => {
                  const targetReport = resolveConfirmAction.report;
                  const action = resolveConfirmAction.action;
                  if (moderatorReply.trim()) {
                    await sendAdminReply(targetReport.reviewId, moderatorReply.trim());
                  }
                  await resolveReportedReview(targetReport._id, action);
                  setResolveConfirmAction(null);
                  setReportToResolve(null);
                  setModeratorReply('');
                }}
              >
                {resolveConfirmAction.action === 'complete' ? 'Complete' : 'Delete Review'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    );

    if (reviewsSubTab === 'reviews') {
      const totalPages = Math.max(1, Math.ceil(reviewsTable.total / reviewsTable.pageSize));
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
            <div className="admin-section-card__search-input-wrapper">
              <input
                type="search"
                className="admin-section-card__search-input"
                value={reviewsTable.searchTerm}
                onChange={e => reviewsTable.setSearchTerm(e.target.value)}
                placeholder="Search reviews by ID, game, author, or comment"
              />
              {reviewsTable.searchTerm && (
                <button
                  type="button"
                  className="browse-page__search-clear navbar__search-clear--full"
                  onClick={() => reviewsTable.setSearchTerm('')}
                >
                  <span className="browse-page__search-clear-icon" aria-hidden="true">
                    ×
                  </span>
                  <span className="browse-page__search-clear-label">Clear</span>
                </button>
              )}
            </div>
          </div>

          {reviewsTable.error && (
            <div role="alert" className="admin-error-message">
              {reviewsTable.error}
            </div>
          )}

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
                {reviewsTable.loading ? (
                  <tr className="admin-table__empty-row">
                    <td colSpan={6}>
                      <p className="admin-table__empty-message">Loading reviews...</p>
                    </td>
                  </tr>
                ) : reviewsTable.items.length === 0 ? (
                  <tr className="admin-table__empty-row">
                    <td colSpan={6}>
                      <p className="admin-table__empty-message">No reviews</p>
                    </td>
                  </tr>
                ) : (
                  reviewsTable.items.map(review => (
                    <tr key={review._id}>
                      <td>{review.publicId ?? review._id}</td>
                      <td>{review.gameTitle ?? review.gameSlug ?? review.gameId}</td>
                      <td>{review.authorName}</td>
                      <td>
                        <span>{review.body.length > 80 ? `${review.body.slice(0, 80)}…` : review.body}</span>
                        {/* Placeholder for future voice badge */}
                      </td>
                      <td>{new Date(review.createdAt).toLocaleDateString()}</td>
                      <td className="admin-table__actions-cell admin-table__actions-cell--split">
                        <button
                          type="button"
                          className="admin-table__action-button"
                          onClick={() => setReviewToReply(review)}
                        >
                          Manage
                        </button>
                        <div className="admin-table__actions-spacer" aria-hidden="true" />
                        <button
                          type="button"
                          className="admin-table__action-button admin-table__action-button--secondary"
                          onClick={() =>
                            setReviewToDelete({
                              id: review._id,
                              displayId: review.publicId ?? review._id,
                              authorName: review.authorName,
                            })
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {reviewsTable.total > reviewsTable.pageSize && (
            <div className="admin-pagination">
              <Pagination
                page={reviewsTable.page}
                totalPages={totalPages}
                onPageChange={reviewsTable.setPage}
                ariaLabel="Reviews pagination"
              />
            </div>
          )}

          {/* Delete Review Modal */}
          <Modal
            isOpen={!!reviewToDelete}
            titleId="delete-review-title"
            onClose={() => setReviewToDelete(null)}
            contentClassName="modal-content--wide"
          >
            <h2 id="delete-review-title" className="dialog__title">
              Delete Review - Admin Action
            </h2>
            {reviewToDelete && (
              <p className="dialog__meta">
                <strong>Review ID:</strong> {reviewToDelete.displayId ?? reviewToDelete.id}
              </p>
            )}
            <p className="dialog__message">
              {`Are you sure you want to delete this review${
                reviewToDelete?.authorName ? ` from ${reviewToDelete.authorName}` : ''
              }? This action cannot be undone.`}
            </p>
            <div className="dialog__actions">
              <button type="button" className="dialog__button dialog__button--secondary" onClick={() => setReviewToDelete(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="dialog__button dialog__button--primary"
                onClick={async () => {
                  if (reviewToDelete) {
                    await deleteReview(reviewToDelete.id);
                    setReviewToDelete(null);
                  }
                }}
              >
                Delete Review
              </button>
            </div>
          </Modal>

          {/* Reply Modal */}
          <Modal
            isOpen={!!reviewToReply}
            titleId="reply-review-title"
            onClose={() => {
              setReviewToReply(null);
              setReplyText('');
              setReplyError(null);
            }}
            contentClassName="modal-content--wide"
          >
            {reviewToReply && (
              <div>
                <h2 id="reply-review-title" className="dialog__title">
                  Reply to Review
                </h2>
                <div className="dialog__message">
                  <p><strong>Review ID:</strong> {reviewToReply.publicId ?? reviewToReply._id}</p>
                  <p><strong>Game:</strong> {reviewToReply.gameTitle ?? reviewToReply.gameSlug ?? reviewToReply.gameId}</p>
                  <p><strong>Author:</strong> {reviewToReply.authorName}</p>
                  <p><strong>Date:</strong> {new Date(reviewToReply.createdAt).toLocaleDateString()}</p>
                  <p><strong>Comment:</strong> {reviewToReply.body}</p>
                </div>
                <label className="form-label" htmlFor="admin-reply-text">
                  Admin Reply to Author
                </label>
                <textarea
                  id="admin-reply-text"
                  className="profile-textarea"
                  value={replyText}
                  onChange={e => {
                    const value = e.target.value;
                    setReplyText(value);
                    const trimmed = value.trim();
                    if (!trimmed) {
                      setReplyError(null);
                    } else if (trimmed.length < ADMIN_REPLY_MIN_CHARS || trimmed.length > ADMIN_REPLY_MAX_CHARS) {
                      setReplyError(`Reply must be between ${ADMIN_REPLY_MIN_CHARS} and ${ADMIN_REPLY_MAX_CHARS} characters.`);
                    } else {
                      setReplyError(null);
                    }
                  }}
                />
                {replyError && (
                  <p className="admin-form-field-error" role="alert">
                    {replyError}
                  </p>
                )}
                {adminActionsError && !replyError && (
                  <p className="admin-form-field-error" role="alert">
                    {adminActionsError}
                  </p>
                )}
                <div className="dialog__actions">
                  <button
                    type="button"
                    className="dialog__button dialog__button--secondary"
                    onClick={() => {
                      setReviewToReply(null);
                      setReplyText('');
                      setReplyError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="dialog__button dialog__button--primary"
                    disabled={!replyText.trim() || !!replyError}
                    onClick={async () => {
                      const trimmed = replyText.trim();
                      if (!trimmed || replyError) {
                        return;
                      }
                      await sendAdminReply(reviewToReply._id, trimmed);
                      setReviewToReply(null);
                      setReplyText('');
                      setReplyError(null);
                    }}
                  >
                    Send Reply
                  </button>
                </div>
              </div>
            )}
          </Modal>
          {confirmResolveModal}
        </section>
      );
    }

    if (reviewsSubTab === 'reported') {
      const totalPages = Math.max(1, Math.ceil(reportedTable.total / reportedTable.pageSize));
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
            <div className="admin-section-card__search-input-wrapper">
              <input
                type="search"
                className="admin-section-card__search-input"
                value={reportedTable.searchTerm}
                onChange={e => reportedTable.setSearchTerm(e.target.value)}
                placeholder="Search reported reviews by ID, game, author, or reason"
              />
              {reportedTable.searchTerm && (
                <button
                  type="button"
                  className="browse-page__search-clear navbar__search-clear--full"
                  onClick={() => reportedTable.setSearchTerm('')}
                >
                  <span className="browse-page__search-clear-icon" aria-hidden="true">
                    ×
                  </span>
                  <span className="browse-page__search-clear-label">Clear</span>
                </button>
              )}
            </div>
          </div>

          {reportedTable.error && (
            <div role="alert" className="admin-error-message">
              {reportedTable.error}
            </div>
          )}

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
                {reportedTable.loading ? (
                  <tr className="admin-table__empty-row">
                    <td colSpan={6}>
                      <p className="admin-table__empty-message">Loading reported reviews...</p>
                    </td>
                  </tr>
                ) : reportedTable.items.length === 0 ? (
                  <tr className="admin-table__empty-row">
                    <td colSpan={6}>
                      <p className="admin-table__empty-message">No reported reviews</p>
                    </td>
                  </tr>
                ) : (
                  reportedTable.items.map(report => (
                    <tr key={report._id}>
                      <td>{report._id}</td>
                      <td>{report.gameTitle ?? report.gameSlug ?? report.reviewPublicId ?? report.reviewId}</td>
                      <td>{report.reviewAuthorName ?? ''}</td>
                      <td>{report.reportReason}</td>
                      <td>{formatDate(report.createdAt)}</td>
                      <td className="admin-table__actions-cell">
                        <button
                          type="button"
                          className="admin-table__action-button admin-table__action-button--secondary"
                          onClick={() => {
                            setReportToResolve(report);
                            setModeratorReply('');
                            setModeratorReplyError(null);
                          }}
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {reportedTable.total > reportedTable.pageSize && (
            <div className="admin-pagination">
              <Pagination
                page={reportedTable.page}
                totalPages={totalPages}
                onPageChange={reportedTable.setPage}
                ariaLabel="Reported reviews pagination"
              />
            </div>
          )}

          {/* Resolve Modal */}
          <Modal
            isOpen={!!reportToResolve}
            titleId="resolve-report-title"
            onClose={() => {
              setReportToResolve(null);
              setModeratorReply('');
              setModeratorReplyError(null);
            }}
            contentClassName="modal-content--wide"
          >
            {reportToResolve && (
              <div>
                <h2 id="resolve-report-title" className="dialog__title">
                  Resolve Reported Review
                </h2>
                <div className="report-modal__sections">
                  <div className="report-modal__section">
                    <h3>Report Information</h3>
                    <p><strong>Report ID:</strong> {reportToResolve._id}</p>
                    <p><strong>Reason:</strong> {reportToResolve.reportReason}</p>
                    <p><strong>Reported By:</strong> {reportToResolve.reporterEmail ?? 'Unknown'}</p>
                    <p><strong>Reported Date:</strong> {new Date(reportToResolve.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="report-modal__section">
                    <h3>Review Content</h3>
                    <p><strong>Review ID:</strong> {reportToResolve.reviewPublicId ?? reportToResolve.reviewId}</p>
                    <p><strong>Game:</strong> {reportToResolve.gameTitle ?? reportToResolve.gameSlug ?? ''}</p>
                    <p><strong>Author:</strong> {reportToResolve.reviewAuthorName ?? ''}</p>
                    <p><strong>Text:</strong> {reportToResolve.reviewBody ?? 'No content available'}</p>
                  </div>
                  <div className="report-modal__section">
                    <h3>Admin Reply to Author (optional)</h3>
                    <textarea
                      className="report-modal__textarea"
                      placeholder="Explain the decision to the reviewer..."
                      value={moderatorReply}
                      onChange={e => {
                        const value = e.target.value;
                        setModeratorReply(value);
                        const trimmed = value.trim();
                        if (!trimmed) {
                          setModeratorReplyError(null);
                        } else if (trimmed.length < ADMIN_REPLY_MIN_CHARS || trimmed.length > ADMIN_REPLY_MAX_CHARS) {
                          setModeratorReplyError(`Reply must be between ${ADMIN_REPLY_MIN_CHARS} and ${ADMIN_REPLY_MAX_CHARS} characters.`);
                        } else {
                          setModeratorReplyError(null);
                        }
                      }}
                    />
                    {moderatorReplyError && (
                      <p className="admin-form-field-error" role="alert">
                        {moderatorReplyError}
                      </p>
                    )}
                    {adminActionsError && !moderatorReplyError && (
                      <p className="admin-form-field-error" role="alert">
                        {adminActionsError}
                      </p>
                    )}
                    <p className="admin-form-field-hint">
                      Any reply entered here will be sent when you choose Complete or Delete Review.
                    </p>
                  </div>
                </div>
                <div className="dialog__actions dialog__actions--split">
                  <div className="dialog__actions-group">
                    <button
                      type="button"
                      className="dialog__button dialog__button--secondary"
                      onClick={() => {
                        setReportToResolve(null);
                        setModeratorReply('');
                        setModeratorReplyError(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="dialog__button dialog__button--contrast"
                      disabled={!!moderatorReplyError}
                      onClick={() => setResolveConfirmAction({ action: 'complete', report: reportToResolve })}
                    >
                      Complete
                    </button>
                  </div>
                  <button
                    type="button"
                    className="dialog__button dialog__button--primary"
                    disabled={!!moderatorReplyError}
                    onClick={() => setResolveConfirmAction({ action: 'delete-review', report: reportToResolve })}
                  >
                    Delete Review
                  </button>
                </div>
              </div>
            )}
          </Modal>
          {confirmResolveModal}
        </section>
      );
    }

    const totalPages = Math.max(1, Math.ceil(resolvedTable.total / resolvedTable.pageSize));
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
          <div className="admin-section-card__search-input-wrapper">
            <input
              id="resolved-reviews-search"
              type="search"
              className="admin-section-card__search-input"
              placeholder="Search by game, author, or reason..."
              value={resolvedTable.searchTerm}
              onChange={e => resolvedTable.setSearchTerm(e.target.value)}
            />
            {resolvedTable.searchTerm && (
              <button
                type="button"
                className="browse-page__search-clear navbar__search-clear--full"
                onClick={() => resolvedTable.setSearchTerm('')}
              >
                <span className="browse-page__search-clear-icon" aria-hidden="true">
                  A-
                </span>
                <span className="browse-page__search-clear-label">Clear</span>
              </button>
            )}
          </div>
        </div>

        {resolvedTable.error && (
          <div role="alert" className="admin-error-message">
            {resolvedTable.error}
          </div>
        )}

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
                <th scope="col">Outcome</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resolvedTable.loading ? (
                <tr className="admin-table__empty-row">
                  <td colSpan={7}>
                    <p className="admin-table__empty-message">Loading resolved reported reviews...</p>
                  </td>
                </tr>
              ) : resolvedTable.items.length === 0 ? (
                <tr className="admin-table__empty-row">
                  <td colSpan={7}>
                    <p className="admin-table__empty-message">No resolved reported reviews</p>
                  </td>
                </tr>
              ) : (
                resolvedTable.items.map(report => {
                  const reason = report.reportReason || '';
                  return (
                    <tr key={report._id}>
                      <td>{report._id}</td>
                      <td>{report.gameTitle ?? report.gameSlug ?? report.reviewPublicId ?? report.reviewId}</td>
                      <td>{report.reviewAuthorName ?? ''}</td>
                      <td title={reason}>
                        {reason.length > 60 ? `${reason.slice(0, 60)}…` : reason}
                      </td>
                      <td>{formatDate(report.createdAt)}</td>
                      <td>{report.outcome === 'deleted' ? 'Review deleted' : 'Review kept'}</td>
                      <td className="admin-table__actions-cell admin-table__actions-cell--split">
                        <button
                          type="button"
                          className="admin-table__action-button"
                          onClick={() => setResolvedReportToView(report)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {resolvedTable.total > resolvedTable.pageSize && (
          <div className="admin-pagination">
            <Pagination
              page={resolvedTable.page}
              totalPages={totalPages}
              onPageChange={resolvedTable.setPage}
              ariaLabel="Resolved reported reviews pagination"
            />
          </div>
        )}

          <Modal
            isOpen={!!resolvedReportToView}
            titleId="view-resolved-report-title"
            onClose={() => setResolvedReportToView(null)}
            contentClassName="modal-content--wide"
          >
            {resolvedReportToView && (
              <div>
                <h2 id="view-resolved-report-title" className="dialog__title">
                  View Resolved Report
              </h2>
              <div className="report-modal__sections">
                <div className="report-modal__section">
                  <h3>Report Information</h3>
                  <p><strong>Report ID:</strong> {resolvedReportToView._id}</p>
                  <p><strong>Reason:</strong> {resolvedReportToView.reportReason}</p>
                  <p><strong>Reported Date:</strong> {new Date(resolvedReportToView.createdAt).toLocaleDateString()}</p>
                  <p><strong>Outcome:</strong> {resolvedReportToView.outcome === 'deleted' ? 'Review deleted' : 'Review kept'}</p>
                </div>
                <div className="report-modal__section">
                  <h3>Review Content</h3>
                  <p><strong>Review ID:</strong> {resolvedReportToView.reviewPublicId ?? resolvedReportToView.reviewId}</p>
                  <p><strong>Game:</strong> {resolvedReportToView.gameTitle ?? resolvedReportToView.gameSlug ?? ''}</p>
                  <p><strong>Author:</strong> {resolvedReportToView.reviewAuthorName ?? ''}</p>
                  <p><strong>Text:</strong> {resolvedReportToView.reportReason ?? 'No content available'}</p>
                </div>
              </div>
              <div className="dialog__actions">
                <button
                  type="button"
                  className="dialog__button dialog__button--secondary"
                  onClick={() => setResolvedReportToView(null)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
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

  const renderReportModal = () => (
    <Modal
      isOpen={!!activeReport}
      titleId="general-report-modal-title"
      onClose={closeReportModal}
      contentClassName="admin-report-modal__container"
    >
      {activeReport && (
        <div className="admin-report-modal">
          <header className="admin-report-modal__header">
            <div>
              <p className="admin-report-modal__eyebrow">
                {reportModalMode === 'view' ? 'General Report Details' : 'Reply to General Report'}
              </p>
              <h2 id="general-report-modal-title" className="admin-report-modal__title">
                Report {formatReportCode(activeReport)}
              </h2>
            </div>
            <button type="button" className="admin-report-modal__close" onClick={closeReportModal} aria-label="Close">
              ×
            </button>
          </header>

          <section className="admin-report-modal__section" aria-label="Report details">
            <dl className="admin-report-modal__definition-list">
              <div>
                <dt>Status</dt>
                <dd>
                  <span
                    className={
                      'admin-badge ' +
                      (activeReport.status === 'resolved' ? 'admin-badge--status' : 'admin-badge--issue')
                    }
                  >
                    {activeReport.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Reported By</dt>
                <dd>{formatReporter(activeReport)}</dd>
              </div>
              <div>
                <dt>Report Date</dt>
                <dd>{formatDate(activeReport.createdAt)}</dd>
              </div>
              {activeReport.resolvedAt && (
                <div>
                  <dt>Resolution Date</dt>
                  <dd>{formatDate(activeReport.resolvedAt)}</dd>
                </div>
              )}
            </dl>
            <div className="admin-report-modal__description">
              <h3>Description</h3>
              <p>{activeReport.description || 'No description provided.'}</p>
            </div>
          </section>

          {activeReport.adminReplies.length > 0 && (
            <section className="admin-report-modal__section" aria-label="Previous admin replies">
              <h3>Previous Admin Reply</h3>
              <div className="admin-report-modal__history-entry">
                <p>{activeReport.adminReplies[activeReport.adminReplies.length - 1].message}</p>
                <span>
                  {activeReport.adminReplies[activeReport.adminReplies.length - 1].adminName || 'Admin'} ·{' '}
                  {formatDate(
                    activeReport.adminReplies[activeReport.adminReplies.length - 1].createdAt
                  )}
                </span>
              </div>
            </section>
          )}

          {reportModalMode === 'reply' && (
            <section className="admin-report-modal__section" aria-label="Admin reply">
              <label htmlFor="admin-report-reply" className="admin-report-modal__label">
                Admin Reply to Reporter
              </label>
              <textarea
                id="admin-report-reply"
                className="admin-report-modal__textarea"
                rows={4}
                value={reportReplyMessage}
                onChange={e => setReportReplyMessage(e.target.value)}
                placeholder="Type your reply to the reporter..."
              />
            </section>
          )}

          {reportModalError && (
            <p className="admin-report-modal__error" role="alert">
              {reportModalError}
            </p>
          )}

          <div className="admin-report-modal__actions">
            <button type="button" className="admin-report-modal__secondary" onClick={closeReportModal}>
              Cancel
            </button>
            {reportModalMode === 'reply' ? (
              <button
                type="button"
                className="admin-report-modal__primary"
                onClick={handleReportReplySubmit}
                disabled={reportModalSubmitting}
              >
                {reportModalSubmitting ? 'Sending...' : 'Send Reply & Resolve'}
              </button>
            ) : (
              <button type="button" className="admin-report-modal__primary" onClick={closeReportModal}>
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );

  const renderGameReportModal = () => (
    <Modal
      isOpen={!!activeGameReport}
      titleId="game-report-modal-title"
      onClose={closeGameReportModal}
      contentClassName="admin-report-modal__container"
    >
      {activeGameReport && (
        <div className="admin-report-modal">
          <header className="admin-report-modal__header">
            <div>
              <p className="admin-report-modal__eyebrow">
                {gameReportModalMode === 'view' ? 'Game Report Details' : 'Reply to Game Report'}
              </p>
              <h2 id="game-report-modal-title" className="admin-report-modal__title">
                Report {activeGameReport.reportCode}
              </h2>
            </div>
            <button
              type="button"
              className="admin-report-modal__close"
              onClick={closeGameReportModal}
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <section className="admin-report-modal__section" aria-label="Game report details">
            <dl className="admin-report-modal__definition-list">
              <div>
                <dt>Game</dt>
                <dd>{activeGameReport.gameTitle || 'Unknown game'}</dd>
              </div>
              <div>
                <dt>Issue Type</dt>
                <dd>
                  <span className="admin-badge admin-badge--issue">
                    {formatGameIssueType(activeGameReport)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Reported By</dt>
                <dd>{formatGameReportReporter(activeGameReport)}</dd>
              </div>
              <div>
                <dt>Report Date</dt>
                <dd>{formatDate(activeGameReport.createdAt)}</dd>
              </div>
              {activeGameReport.resolvedAt && (
                <div>
                  <dt>Resolution</dt>
                  <dd>
                    {formatDate(activeGameReport.resolvedAt)}
                    {activeGameReport.resolvedByName ? ` · ${activeGameReport.resolvedByName}` : ''}
                  </dd>
                </div>
              )}
            </dl>
            <div className="admin-report-modal__description">
              <h3>Description</h3>
              <p>{activeGameReport.description || 'No description provided.'}</p>
            </div>
          </section>

          {activeGameReport.adminReplies.length > 0 && (
            <section className="admin-report-modal__section" aria-label="Previous admin replies">
              <h3>Previous Admin Reply</h3>
              <div className="admin-report-modal__history-entry">
                <p>{activeGameReport.adminReplies[activeGameReport.adminReplies.length - 1].message}</p>
                <span>
                  {activeGameReport.adminReplies[activeGameReport.adminReplies.length - 1].adminName || 'Admin'} ·{' '}
                  {formatDate(
                    activeGameReport.adminReplies[activeGameReport.adminReplies.length - 1].createdAt
                  )}
                </span>
              </div>
            </section>
          )}

          {gameReportModalMode === 'reply' && (
            <section className="admin-report-modal__section" aria-label="Admin reply">
              <label htmlFor="admin-game-report-reply" className="admin-report-modal__label">
                Admin Reply to Reporter
              </label>
              <textarea
                id="admin-game-report-reply"
                className="admin-report-modal__textarea"
                rows={4}
                value={gameReportReplyMessage}
                onChange={e => setGameReportReplyMessage(e.target.value)}
                placeholder="Type your reply to the reporter..."
              />
            </section>
          )}

          {gameReportModalError && (
            <p className="admin-report-modal__error" role="alert">
              {gameReportModalError}
            </p>
          )}

          <div className="admin-report-modal__actions">
            <button type="button" className="admin-report-modal__secondary" onClick={closeGameReportModal}>
              Cancel
            </button>
            {gameReportModalMode === 'reply' ? (
              <button
                type="button"
                className="admin-report-modal__primary"
                onClick={handleGameReportReplySubmit}
                disabled={gameReportModalSubmitting}
              >
                {gameReportModalSubmitting ? 'Sending...' : 'Send Reply & Resolve'}
              </button>
            ) : (
              <button type="button" className="admin-report-modal__primary" onClick={closeGameReportModal}>
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );

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
            <p
              className={
                'admin-stat-card__value' +
                (generalReportsLoading ? ' admin-stat-card__value--skeleton' : '')
              }
              aria-label={
                generalReportsLoading
                  ? 'Loading general reports count'
                  : `${generalReports.length} general reports require attention`
              }
            >
              {generalReportsLoading ? '—' : generalReports.length}
            </p>
            <p className="admin-stat-card__meta">Require attention</p>
          </article>
          <article className="admin-stat-card" aria-label="Active reviews statistic">
            <div className="admin-stat-card__header">
              <h2 className="admin-stat-card__title">Active Reviews</h2>
            </div>
            <p className="admin-stat-card__value" aria-live="polite" aria-label={activeReviewsAriaLabel}>
              {loadingActiveReviews ? '...' : activeReviewsCount ?? '--'}
            </p>
            <p className="admin-stat-card__meta">
              {activeReviewsError ? activeReviewsError : 'Published reviews'}
            </p>
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
      {renderReportModal()}
      {renderGameReportModal()}
    </main>
  );
};

export default AdminPage;
