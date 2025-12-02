/**
 * Notifications API Service
 * Provides API functions for managing user notifications.
 * @module notificationsApi
 */
import { getAuthHeaders } from './api';
import { apiGet, apiPatch } from '../utils/apiHelper';

/**
 * Represents a notification as returned by the API.
 * @interface Notification
 */
export interface Notification {
  /** Unique identifier for the notification */
  id: string;
  /** Type of notification */
  type: 'report_submitted' | 'report_resolved' | 'review_deleted' | 'review_liked' | 'review_created';
  /** Notification title */
  title: string;
  /** Notification message/content */
  message: string;
  /** Whether the notification has been read */
  read: boolean;
  /** Related report ID (if applicable) */
  reportId?: string;
  /** Related review ID (if applicable) */
  reviewId?: string;
  /** Related game ID (if applicable) */
  gameId?: string;
  /** Additional metadata */
  metadata?: {
    reportCode?: string;
    reportType?: string;
    reviewContent?: string;
    deletionReason?: string;
    adminName?: string;
    likedBy?: string;
    gameTitle?: string;
    gameSlug?: string;
  };
  /** ISO timestamp when the notification was created */
  createdAt: string;
  /** ISO timestamp when the notification was read (if read) */
  readAt?: string;
}

/**
 * Response structure from the notifications list endpoint.
 * @interface NotificationsResponse
 */
interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
}

/**
 * Response structure from the unread count endpoint.
 * @interface UnreadCountResponse
 */
interface UnreadCountResponse {
  success: boolean;
  count: number;
}

/**
 * Fetches all notifications for the authenticated user.
 * @param {object} options - Query options
 * @param {boolean} options.read - Filter by read status
 * @param {string} options.type - Filter by notification type
 * @param {number} options.limit - Limit number of results
 * @param {number} options.skip - Skip number of results
 * @returns {Promise<Notification[]>} Array of notifications
 */
export async function fetchNotifications(options: {
  read?: boolean;
  type?: Notification['type'];
  limit?: number;
  skip?: number;
} = {}): Promise<Notification[]> {
  const params = new URLSearchParams();
  if (options.read !== undefined) {
    params.append('read', options.read.toString());
  }
  if (options.type) {
    params.append('type', options.type);
  }
  if (options.limit) {
    params.append('limit', options.limit.toString());
  }
  if (options.skip) {
    params.append('skip', options.skip.toString());
  }

  const queryString = params.toString();
  const url = `/api/notifications${queryString ? `?${queryString}` : ''}`;

  const response = await apiGet(url, { headers: getAuthHeaders() });

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  const data: NotificationsResponse = await response.json();
  return data.notifications;
}

/**
 * Gets the count of unread notifications for the authenticated user.
 * @returns {Promise<number>} Count of unread notifications
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiGet('/api/notifications/unread-count', { headers: getAuthHeaders() });

  if (!response.ok) {
    throw new Error('Failed to fetch unread count');
  }

  const data: UnreadCountResponse = await response.json();
  return data.count;
}

/**
 * Marks a notification as read.
 * @param {string} notificationId - The notification ID
 * @returns {Promise<Notification>} The updated notification
 */
export async function markNotificationAsRead(notificationId: string): Promise<Notification> {
  const response = await apiPatch(
    `/api/notifications/${notificationId}/read`,
    {},
    { headers: getAuthHeaders() }
  );

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }

  const data = await response.json();
  return data.notification;
}

/**
 * Marks all notifications as read for the authenticated user.
 * @returns {Promise<void>}
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await apiPatch('/api/notifications/read-all', {}, { headers: getAuthHeaders() });

  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
}

