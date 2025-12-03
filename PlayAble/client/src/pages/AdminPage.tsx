import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { GameDto } from '../services/api';
import { getReviewStats } from '../services/api';
import type { AdminResolvedReviewReport } from '../services/adminReviewsService';
import {
  AdminGeneralReport,
  fetchGeneralReports,
  replyToGeneralReport,
} from '../services/adminReportsService';
import {
  AdminGameReport,
  fetchGameReports as fetchAdminGameReports,
  replyToGameReport,
} from '../services/adminGameReportsService';
import { getAdminGames } from '../services/gamesAdminService';
import { useReviewsTable, useReportedReviewsTable, useResolvedReportedReviewsTable } from '../hooks/adminReviews';
import useAdminReviewActions from '../hooks/useAdminReviewActions';
import GeneralReportsSection from './admin/GeneralReportsSection';
import ReviewsSection from './admin/ReviewsSection';
import GamesSection from './admin/GamesSection';
import GeneralReportModal from './admin/modals/GeneralReportModal';
import GameReportModal from './admin/modals/GameReportModal';

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
            <p
              className={
                'admin-stat-card__value' +
                (loadingActiveReviews ? ' admin-stat-card__value--skeleton' : '')
              }
              aria-label={
                loadingActiveReviews
                  ? 'Loading active reviews count'
                  : activeReviewsAriaLabel
              }
            >
              {loadingActiveReviews ? '—' : activeReviewsCount ?? '--'}
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
          <GeneralReportsSection
            generalSubTab={generalSubTab}
            paginatedGeneralReports={paginatedGeneralReports}
            paginatedResolvedGeneralReports={paginatedResolvedGeneralReports}
            generalReportsLoading={generalReportsLoading}
            resolvedReportsLoading={resolvedReportsLoading}
            generalReportsError={generalReportsError}
            resolvedReportsError={resolvedReportsError}
            generalReportsSearch={generalReportsSearch}
            resolvedReportsSearch={resolvedReportsSearch}
            setGeneralReportsSearch={setGeneralReportsSearch}
            setResolvedReportsSearch={setResolvedReportsSearch}
            generalReportsTotalPages={generalReportsTotalPages}
            resolvedGeneralReportsTotalPages={resolvedGeneralReportsTotalPages}
            generalReportsPage={generalReportsPage}
            resolvedGeneralReportsPage={resolvedGeneralReportsPage}
            setGeneralReportsPage={setGeneralReportsPage}
            setResolvedGeneralReportsPage={setResolvedGeneralReportsPage}
            formatDate={formatDate}
            truncateDescription={truncateDescription}
            formatReporter={formatReporter}
            openReportModal={openReportModal}
          />
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
          <ReviewsSection
            reviewsSubTab={reviewsSubTab}
            reviewsTable={reviewsTable}
            reportedTable={reportedTable}
            resolvedTable={resolvedTable}
            setReviewToReply={setReviewToReply}
            setReviewToDelete={setReviewToDelete}
            reviewToDelete={reviewToDelete}
            reviewToReply={reviewToReply}
            replyText={replyText}
            setReplyText={setReplyText}
            replyError={replyError}
            setReplyError={setReplyError}
            adminActionsError={adminActionsError}
            sendAdminReply={sendAdminReply}
            deleteReview={deleteReview}
            reportToResolve={reportToResolve}
            setReportToResolve={setReportToResolve}
            moderatorReply={moderatorReply}
            setModeratorReply={setModeratorReply}
            moderatorReplyError={moderatorReplyError}
            setModeratorReplyError={setModeratorReplyError}
            resolveConfirmAction={resolveConfirmAction}
            setResolveConfirmAction={setResolveConfirmAction}
            resolvedReportToView={resolvedReportToView}
            setResolvedReportToView={setResolvedReportToView}
            resolveReportedReview={resolveReportedReview}
            formatDate={formatDate}
          />
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
          <GamesSection
            gamesSubTab={gamesSubTab}
            handleAddNewGame={handleAddNewGame}
            gamesSearchTerm={gamesSearchTerm}
            setGamesSearchTerm={setGamesSearchTerm}
            gamesError={gamesError}
            gamesLoading={gamesLoading}
            pageGames={pageGames}
            gamesPage={gamesPage}
            setGamesPage={setGamesPage}
            totalGamesPages={totalGamesPages}
            GAMES_PAGE_SIZE={GAMES_PAGE_SIZE}
            handleManageGame={handleManageGame}
            gameReportsSearch={gameReportsSearch}
            setGameReportsSearch={setGameReportsSearch}
            gameReportsError={gameReportsError}
            gameReportsLoading={gameReportsLoading}
            filteredGameReports={filteredGameReports}
            paginatedGameReports={paginatedGameReports}
            gameReportsTotalPages={gameReportsTotalPages}
            gameReportsPage={gameReportsPage}
            setGameReportsPage={setGameReportsPage}
            formatGameIssueType={formatGameIssueType}
            truncateDescription={truncateDescription}
            formatDate={formatDate}
            openGameReportModal={openGameReportModal}
            resolvedGameReportsSearch={resolvedGameReportsSearch}
            setResolvedGameReportsSearch={setResolvedGameReportsSearch}
            resolvedGameReportsError={resolvedGameReportsError}
            resolvedGameReportsLoading={resolvedGameReportsLoading}
            filteredResolvedGameReports={filteredResolvedGameReports}
            paginatedResolvedGameReports={paginatedResolvedGameReports}
            resolvedGameReportsTotalPages={resolvedGameReportsTotalPages}
            resolvedGameReportsPage={resolvedGameReportsPage}
            setResolvedGameReportsPage={setResolvedGameReportsPage}
          />
        </section>
      )}
      <GeneralReportModal
        activeReport={activeReport}
        reportModalMode={reportModalMode}
        closeReportModal={closeReportModal}
        formatReporter={formatReporter}
        formatDate={formatDate}
        reportReplyMessage={reportReplyMessage}
        setReportReplyMessage={setReportReplyMessage}
        reportModalError={reportModalError}
        handleReportReplySubmit={handleReportReplySubmit}
        reportModalSubmitting={reportModalSubmitting}
      />
      <GameReportModal
        activeGameReport={activeGameReport}
        gameReportModalMode={gameReportModalMode}
        closeGameReportModal={closeGameReportModal}
        formatGameIssueType={formatGameIssueType}
        formatGameReportReporter={formatGameReportReporter}
        formatDate={formatDate}
        gameReportReplyMessage={gameReportReplyMessage}
        setGameReportReplyMessage={setGameReportReplyMessage}
        gameReportModalError={gameReportModalError}
        handleGameReportReplySubmit={handleGameReportReplySubmit}
        gameReportModalSubmitting={gameReportModalSubmitting}
      />
    </main>
  );
};

export default AdminPage;

