import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Notification,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from '../services/notificationsApi';
import { getReportById, type Report } from '../services/reportApi';
import { getReviewById } from '../services/api';
import Modal from '../components/ui/Modal';
import type { AppPath } from '../App';

interface InboxPageProps {
  onNavigate?: (path: AppPath) => void;
  onOpenGameReport?: (gameId: string) => void;
  onOpenReviewReport?: (reviewId: string, gameId: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

const InboxPage: React.FC<InboxPageProps> = ({ onNavigate, onOpenGameReport, onOpenReviewReport, onUnreadCountChange }) => {
  const { user, isAuthenticated } = useAuth();
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

  // Load notifications on mount and when filters change
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

  // Filter and sort notifications
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
      default:
        return '📬';
    }
  };

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
        {unreadCount > 0 && (
          <button
            className="inbox-mark-all-read"
            onClick={handleMarkAllAsRead}
            aria-label="Mark all notifications as read"
          >
            Mark all as read
          </button>
        )}
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
          onClose={() => {
            setSelectedNotification(null);
            setReportDetails(null);
            setReviewDetails(null);
            setDetailsError(null);
          }}
          title={selectedNotification.title}
          aria-label="Notification details"
        >
          <div className="inbox-detail">
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
              {selectedNotification.type === 'review_deleted' && selectedNotification.gameId && (
                <button
                  className="inbox-detail__action"
                  onClick={() => handleViewGame(selectedNotification)}
                  aria-label="View game"
                >
                  View Game
                </button>
              )}
              {selectedNotification.type === 'review_liked' && selectedNotification.reviewId && selectedNotification.gameId && (
                <button
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
    </main>
  );
};

export default InboxPage;
