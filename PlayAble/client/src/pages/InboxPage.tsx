import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Notification,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsUnread,
  deleteAllNotifications,
  getUnreadNotificationCount,
} from '../services/notificationsApi';
import { getReportById, type Report } from '../services/reportApi';
import { getReviewById } from '../services/api';
import Modal from '../components/ui/Modal';
import type { AppPath } from '../App';
import { applyAccessibilityPreferences, DEFAULT_HIGH_CONTRAST_THEME } from '../utils/accessibility';

/**
 * Props for the InboxPage component.
 * 
 * @interface InboxPageProps
 * @property {((path: AppPath) => void)} [onNavigate] - Callback function to handle navigation
 * @property {((gameId: string) => void)} [onOpenGameReport] - Callback to open a game report modal
 * @property {((reviewId: string, gameId: string) => void)} [onOpenReviewReport] - Callback to open a review report modal
 * @property {((count: number) => void)} [onUnreadCountChange] - Callback to notify parent of unread count changes
 */
interface InboxPageProps {
  onNavigate?: (path: AppPath) => void;
  onOpenGameReport?: (gameId: string) => void;
  onOpenReviewReport?: (reviewId: string, gameId: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

/**
 * InboxPage Component
 * 
 * Main component for displaying and managing user notifications. Provides a comprehensive
 * interface for viewing, filtering, sorting, and managing notifications including reports,
 * review updates, and other user activity notifications.
 * 
 * Features:
 * - Display notifications with read/unread status
 * - Filter by type and read status
 * - Search notifications by content
 * - Sort by newest/oldest
 * - Mark notifications as read/unread
 * - View detailed notification information
 * - Clear all notifications
 * 
 * @component
 * @param {InboxPageProps} props - Component props
 * @returns {JSX.Element} The rendered inbox page
 */
const InboxPage: React.FC<InboxPageProps> = ({ onNavigate, onOpenGameReport, onOpenReviewReport, onUnreadCountChange }) => {
  const { user, isAuthenticated, userSettings } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [filterType, setFilterType] = useState<Notification['type'] | 'all'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [unreadCount, setUnreadCount] = useState(0);
  const [reportDetails, setReportDetails] = useState<Report | null>(null);
  const [reviewDetails, setReviewDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isMarkingUnread, setIsMarkingUnread] = useState(false);

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

  /**
   * Loads notifications from the API when the component mounts or when authentication state changes.
   * Also updates the unread notification count and notifies the parent component.
   * 
   * @effect
   * @dependencies isAuthenticated
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const loadNotifications = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchNotifications();
        setNotifications(data);
        
        // Also update unread count
        const count = await getUnreadNotificationCount();
        setUnreadCount(count);
        if (onUnreadCountChange) {
          onUnreadCountChange(count);
        }
      } catch (err) {
        console.error('Error loading notifications', err);
        setError('Failed to load notifications. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [isAuthenticated]);

  /**
   * Filters and sorts notifications based on current filter and sort settings.
   * Applies type filter, read status filter, search term filter, and date sorting.
   * 
   * @type {Notification[]}
   * @memoized
   * @dependencies notifications, filterType, filterRead, searchTerm, sortOrder
   */
  const filteredAndSortedNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    // Filter by read status
    if (filterRead === 'read') {
      filtered = filtered.filter(n => n.read);
    } else if (filterRead === 'unread') {
      filtered = filtered.filter(n => !n.read);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(n => {
        return (
          n.title.toLowerCase().includes(term) ||
          n.message.toLowerCase().includes(term) ||
          n.metadata?.reportCode?.toLowerCase().includes(term) ||
          n.metadata?.gameTitle?.toLowerCase().includes(term) ||
          n.metadata?.reviewContent?.toLowerCase().includes(term)
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [notifications, filterType, filterRead, searchTerm, sortOrder]);

  /**
   * Handles clicking on a notification to view its details.
   * Marks the notification as read if it's currently unread.
   * Fetches report or review details if the notification references them.
   * Opens a modal to display the full notification information.
   * 
   * @async
   * @param {Notification} notification - The notification that was clicked
   * @returns {Promise<void>}
   */
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        const updated = await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? updated : n))
        );
        const newCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newCount);
        if (onUnreadCountChange) {
          onUnreadCountChange(newCount);
        }
        // Update the notification object to reflect read status
        notification = updated;
      } catch (err) {
        console.error('Error marking notification as read', err);
        // Still show the notification even if marking as read fails
      }
    }

    setSelectedNotification(notification);
    setReportDetails(null);
    setReviewDetails(null);
    setDetailsError(null);

    // Fetch report details if notification has a reportId
    if (notification.reportId) {
      setLoadingDetails(true);
      try {
        const report = await getReportById(notification.reportId);
        setReportDetails(report);
      } catch (err) {
        console.error('Error fetching report details', err);
        setDetailsError('Failed to load report details.');
      } finally {
        setLoadingDetails(false);
      }
    }

    // Fetch review details if notification has a reviewId
    if (notification.reviewId) {
      setLoadingDetails(true);
      try {
        const reviewData = await getReviewById(notification.reviewId);
        setReviewDetails(reviewData);
      } catch (err) {
        console.error('Error fetching review details', err);
        setDetailsError('Failed to load review details.');
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  /**
   * Marks all notifications as read.
   * Refreshes the notification list from the server to get updated state.
   * Updates the unread count and notifies the parent component.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      // Refresh notifications from server to get updated state
      const updatedNotifications = await fetchNotifications();
      setNotifications(updatedNotifications);
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
      if (onUnreadCountChange) {
        onUnreadCountChange(count);
      }
    } catch (err) {
      console.error('Error marking all as read', err);
      // Fallback: update local state even if API call fails
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  };

  /**
   * Marks all notifications as unread.
   * Refreshes the notification list from the server to get updated state.
   * Updates the unread count and notifies the parent component.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const handleMarkAllAsUnread = async () => {
    try {
      setIsMarkingUnread(true);
      await markAllNotificationsAsUnread();
      // Refresh notifications from server to get updated state
      const updatedNotifications = await fetchNotifications();
      setNotifications(updatedNotifications);
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
      if (onUnreadCountChange) {
        onUnreadCountChange(count);
      }
    } catch (err) {
      console.error('Error marking all as unread', err);
    } finally {
      setIsMarkingUnread(false);
    }
  };

  /**
   * Deletes all notifications from the inbox.
   * Clears the local notification list and resets the unread count.
   * Closes the confirmation dialog after successful deletion.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const handleClearInbox = async () => {
    try {
      setIsClearing(true);
      await deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
      if (onUnreadCountChange) {
        onUnreadCountChange(0);
      }
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Error clearing inbox', err);
    } finally {
      setIsClearing(false);
    }
  };

  /**
   * Handles viewing a report associated with a notification.
   * Navigates to the appropriate report page or opens a report modal based on report type.
   * Closes the notification detail modal after navigation.
   * 
   * @param {Notification} notification - The notification containing report information
   */
  const handleViewReport = (notification: Notification) => {
    if (notification.reportId && notification.metadata?.reportType) {
      const reportType = notification.metadata.reportType;
      if (reportType === 'game' && notification.gameId && onOpenGameReport) {
        onOpenGameReport(notification.gameId);
      } else if (reportType === 'review' && notification.reviewId && notification.gameId && onOpenReviewReport) {
        onOpenReviewReport(notification.reviewId, notification.gameId);
      } else if (reportType === 'general' && onNavigate) {
        onNavigate('/report/general');
      }
    }
    setSelectedNotification(null);
  };

  /**
   * Handles viewing a game associated with a notification.
   * Navigates to the game details page if a game slug is available.
   * Closes the notification detail modal after navigation.
   * 
   * @param {Notification} notification - The notification containing game information
   */
  const handleViewGame = (notification: Notification) => {
    if (notification.gameId && onNavigate) {
      // Navigate to game details - we'll need to pass gameId somehow
      // For now, we'll use the gameSlug if available
      if (notification.metadata?.gameSlug) {
        // This would need to be implemented in App.tsx to handle game navigation
        // For now, we'll just navigate to browse
        onNavigate('/browse');
      }
    }
    setSelectedNotification(null);
  };

  /**
   * Formats a date string into a human-readable relative time or absolute date.
   * Returns relative times for recent dates (e.g., "5 minutes ago", "2 hours ago")
   * and absolute dates for older dates (e.g., "03/12/2024").
   * 
   * @param {string} dateString - ISO date string to format
   * @returns {string} Formatted date string
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  /**
   * Returns an emoji icon for a notification type.
   * Used for visual identification of notification types in the UI.
   * 
   * @param {Notification['type']} type - The notification type
   * @returns {string} Emoji icon string
   */
  const getNotificationIcon = (type: Notification['type']): string => {
    switch (type) {
      case 'report_submitted':
        return '✓';
      case 'report_resolved':
        return '✓';
      case 'review_deleted':
        return '🗑️';
      case 'review_liked':
        return '❤️';
      case 'review_created':
        return '✓';
      case 'review_reported':
        return '⚠️';
      default:
        return '📬';
    }
  };

  /**
   * Returns a human-readable label for a notification type.
   * Used for displaying notification type information in the UI.
   * 
   * @param {Notification['type']} type - The notification type
   * @returns {string} Human-readable label
   */
  const getNotificationTypeLabel = (type: Notification['type']): string => {
    switch (type) {
      case 'report_submitted':
        return 'Report Submitted';
      case 'report_resolved':
        return 'Report Resolved';
      case 'review_deleted':
        return 'Review Deleted';
      case 'review_liked':
        return 'Review Liked';
      case 'review_created':
        return 'Review Created';
      case 'review_reported':
        return 'Review Reported';
      default:
        return 'Notification';
    }
  };

  if (!isAuthenticated) {
  return (
    <main className="page-empty" aria-label="Inbox page">
      <h1>Inbox</h1>
        <p>Please sign in to view your notifications.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="inbox-page" aria-label="Inbox page">
        <h1>Inbox</h1>
        <p>Loading notifications...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="inbox-page" aria-label="Inbox page">
        <h1>Inbox</h1>
        <p className="error" role="alert">{error}</p>
      </main>
    );
  }

  return (
    <main className="inbox-page" aria-label="Inbox page">
      <div className="inbox-header">
        <h1>Inbox</h1>
        {unreadCount > 0 && (
          <div className="inbox-unread-badge" aria-live="polite">
            {unreadCount} unread
          </div>
        )}
        <div className="inbox-header__actions">
          {notifications.length > 0 && (
            <>
              {notifications.some(n => n.read) && (
                <button
                  className="inbox-mark-all-unread"
                  onClick={handleMarkAllAsUnread}
                  disabled={isMarkingUnread}
                  aria-label="Mark all notifications as unread"
                >
                  {isMarkingUnread ? 'Marking...' : 'Mark all as unread'}
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  className="inbox-mark-all-read"
                  onClick={handleMarkAllAsRead}
                  aria-label="Mark all notifications as read"
                >
                  Mark all as read
                </button>
              )}
              <button
                className="inbox-clear"
                onClick={() => setShowClearConfirm(true)}
                aria-label="Clear all notifications"
              >
                Clear inbox
              </button>
            </>
          )}
        </div>
      </div>

      <div className="inbox-filters">
        <div className="inbox-filter-group">
          <label htmlFor="filter-type">Filter by type:</label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as Notification['type'] | 'all')}
            aria-label="Filter notifications by type"
          >
            <option value="all">All Types</option>
            <option value="report_submitted">Report Submitted</option>
            <option value="report_resolved">Report Resolved</option>
            <option value="review_deleted">Review Deleted</option>
            <option value="review_liked">Review Liked</option>
            <option value="review_created">Review Created</option>
            <option value="review_reported">Review Reported</option>
          </select>
        </div>

        <div className="inbox-filter-group">
          <label htmlFor="filter-read">Filter by status:</label>
          <select
            id="filter-read"
            value={filterRead}
            onChange={(e) => setFilterRead(e.target.value as 'all' | 'read' | 'unread')}
            aria-label="Filter notifications by read status"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>

        <div className="inbox-filter-group">
          <label htmlFor="sort-order">Sort by:</label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            aria-label="Sort notifications"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <div className="inbox-search-group">
          <label htmlFor="search-notifications">Search:</label>
          <input
            id="search-notifications"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notifications..."
            aria-label="Search notifications"
          />
        </div>
      </div>

      {filteredAndSortedNotifications.length === 0 ? (
        <div className="inbox-empty" role="status" aria-live="polite">
          <p>
            {notifications.length === 0
              ? 'You have no notifications.'
              : 'No notifications match your filters.'}
          </p>
        </div>
      ) : (
        <ul className="inbox-list" role="list">
          {filteredAndSortedNotifications.map((notification) => (
            <li
              key={notification.id}
              className={`inbox-item ${notification.read ? 'inbox-item--read' : 'inbox-item--unread'}`}
              role="listitem"
            >
              <button
                className="inbox-item__button"
                onClick={() => handleNotificationClick(notification)}
                aria-expanded={selectedNotification?.id === notification.id}
                aria-label={`${notification.read ? 'Read' : 'Unread'} notification: ${notification.title}`}
              >
                <div className="inbox-item__icon" aria-hidden="true">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="inbox-item__content">
                  <div className="inbox-item__header">
                    <h3 className="inbox-item__title">{notification.title}</h3>
                    <span className="inbox-item__type">{getNotificationTypeLabel(notification.type)}</span>
                  </div>
                  <p className="inbox-item__message">{notification.message}</p>
                  <time className="inbox-item__time" dateTime={notification.createdAt}>
                    {formatDate(notification.createdAt)}
                  </time>
                </div>
                {!notification.read && (
                  <div className="inbox-item__unread-indicator" aria-label="Unread" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedNotification && (
        <Modal
          isOpen={true}
          titleId="notification-title"
          onClose={() => {
            setSelectedNotification(null);
            setReportDetails(null);
            setReviewDetails(null);
            setDetailsError(null);
          }}
        >
          <div className="inbox-detail">
            <div className="inbox-detail__header">
              <h2 id="notification-title" className="inbox-detail__title">
                {selectedNotification.title}
              </h2>
              <button
                type="button"
                className="inbox-detail__close"
                onClick={() => {
                  setSelectedNotification(null);
                  setReportDetails(null);
                  setReviewDetails(null);
                  setDetailsError(null);
                }}
                aria-label="Close notification"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="inbox-detail__meta">
              <span className="inbox-detail__type">
                {getNotificationTypeLabel(selectedNotification.type)}
              </span>
              <time className="inbox-detail__time" dateTime={selectedNotification.createdAt}>
                {new Date(selectedNotification.createdAt).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>

            <div className="inbox-detail__message">
              <p>{selectedNotification.message}</p>
            </div>

            {loadingDetails && (
              <div className="inbox-detail__loading">
                <p>Loading details...</p>
              </div>
            )}

            {detailsError && (
              <div className="inbox-detail__error" role="alert">
                <p>{detailsError}</p>
              </div>
            )}

            {/* Report Details */}
            {reportDetails && (
              <div className="inbox-detail__report">
                <h3 className="inbox-detail__section-title">Report Details</h3>
                <div className="inbox-detail__report-info">
                  <p><strong>Report Code:</strong> {reportDetails.reportCode}</p>
                  <p><strong>Type:</strong> {reportDetails.type.charAt(0).toUpperCase() + reportDetails.type.slice(1)}</p>
                  <p><strong>Status:</strong> {reportDetails.status.charAt(0).toUpperCase() + reportDetails.status.slice(1)}</p>
                  {reportDetails.issueType && (
                    <p><strong>Issue Type:</strong> {reportDetails.issueType}</p>
                  )}
                </div>
                
                {(reportDetails.description || reportDetails.transcript) && (
                  <div className="inbox-detail__report-content">
                    <h4>Report Content:</h4>
                    {reportDetails.description && (
                      <p>{reportDetails.description}</p>
                    )}
                    {reportDetails.transcript && (
                      <div className="inbox-detail__transcript">
                        <p><strong>Voice Transcript:</strong></p>
                        <p>{reportDetails.transcript}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Replies */}
                {reportDetails.adminReplies && reportDetails.adminReplies.length > 0 && (
                  <div className="inbox-detail__replies">
                    <h4>Admin Response{reportDetails.adminReplies.length > 1 ? 's' : ''}:</h4>
                    {reportDetails.adminReplies.map((reply, index) => (
                      <div key={index} className="inbox-detail__reply">
                        <div className="inbox-detail__reply-header">
                          <strong>{reply.adminName}</strong>
                          <time dateTime={reply.createdAt}>
                            {new Date(reply.createdAt).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </div>
                        <p className="inbox-detail__reply-message">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Review Details */}
            {reviewDetails && (
              <div className="inbox-detail__review">
                <h3 className="inbox-detail__section-title">Review Details</h3>
                {reviewDetails.game && (
                  <p><strong>Game:</strong> {reviewDetails.game.title}</p>
                )}
                {reviewDetails.review && (
                  <div className="inbox-detail__review-content">
                    <p><strong>Author:</strong> {reviewDetails.review.author}</p>
                    <p><strong>Content:</strong></p>
                    <p>{reviewDetails.review.content}</p>
                    <p><strong>Posted:</strong> {new Date(reviewDetails.review.createdAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</p>
                  </div>
                )}
              </div>
            )}

            {/* Metadata (fallback for notifications without fetched details) */}
            {!reportDetails && !reviewDetails && selectedNotification.metadata && (
              <div className="inbox-detail__metadata">
                {selectedNotification.metadata.reportCode && (
                  <p>
                    <strong>Report Code:</strong> {selectedNotification.metadata.reportCode}
                  </p>
                )}
                {selectedNotification.metadata.deletionReason && (
                  <p>
                    <strong>Reason:</strong> {selectedNotification.metadata.deletionReason}
                  </p>
                )}
                {selectedNotification.metadata.adminName && (
                  <p>
                    <strong>Admin:</strong> {selectedNotification.metadata.adminName}
                  </p>
                )}
                {selectedNotification.metadata.reviewContent && (
                  <p>
                    <strong>Review:</strong> {selectedNotification.metadata.reviewContent}
                  </p>
                )}
                {selectedNotification.metadata.likedBy && (
                  <p>
                    <strong>Liked by:</strong> {selectedNotification.metadata.likedBy}
                  </p>
                )}
                {selectedNotification.metadata.gameTitle && (
                  <p>
                    <strong>Game:</strong> {selectedNotification.metadata.gameTitle}
                  </p>
                )}
              </div>
            )}

            <div className="inbox-detail__actions">
              {selectedNotification.read && (
                <button
                  type="button"
                  className="inbox-detail__action inbox-detail__action--secondary"
                  onClick={async () => {
                    try {
                      const updated = await markNotificationAsUnread(selectedNotification.id);
                      setNotifications(prev =>
                        prev.map(n => (n.id === selectedNotification.id ? updated : n))
                      );
                      const count = await getUnreadNotificationCount();
                      setUnreadCount(count);
                      if (onUnreadCountChange) {
                        onUnreadCountChange(count);
                      }
                      setSelectedNotification(updated);
                    } catch (err) {
                      console.error('Error marking notification as unread', err);
                    }
                  }}
                  aria-label="Mark as unread"
                >
                  Mark as unread
                </button>
              )}
              {selectedNotification.type === 'review_deleted' && selectedNotification.gameId && (
                <button
                  type="button"
                  className="inbox-detail__action"
                  onClick={() => handleViewGame(selectedNotification)}
                  aria-label="View game"
                >
                  View Game
                </button>
              )}
              {selectedNotification.type === 'review_liked' && selectedNotification.reviewId && selectedNotification.gameId && (
                <button
                  type="button"
                  className="inbox-detail__action"
                  onClick={() => handleViewGame(selectedNotification)}
                  aria-label="View game"
                >
                  View Game
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      <Modal
        isOpen={showClearConfirm}
        titleId="clear-inbox-title"
        descriptionId="clear-inbox-description"
        onClose={() => !isClearing && setShowClearConfirm(false)}
      >
        <h2 id="clear-inbox-title" className="dialog__title">
          Clear Inbox?
        </h2>
        <p id="clear-inbox-description" className="dialog__message">
          Are you sure you want to delete all notifications? This action cannot be undone.
          {notifications.length > 0 && ` All ${notifications.length} notification${notifications.length !== 1 ? 's' : ''} will be permanently deleted.`}
        </p>
        <div className="dialog__actions">
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={() => setShowClearConfirm(false)}
            disabled={isClearing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dialog__button dialog__button--primary"
            onClick={handleClearInbox}
            disabled={isClearing}
          >
            {isClearing ? 'Clearing...' : 'Clear Inbox'}
          </button>
        </div>
      </Modal>
    </main>
  );
};

export default InboxPage;
