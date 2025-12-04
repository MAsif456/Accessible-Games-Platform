/**
 * Notifications Routes
 * Express routes for handling user notifications.
 * @module notificationsRoutes
 */
import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markAsUnread,
  markAllAsUnread,
  deleteAll,
} from '../controllers/notifications.controller';

const router = Router();

/**
 * GET /api/notifications
 * Gets all notifications for the authenticated user.
 * @query {string} read - Filter by read status ('true' or 'false')
 * @query {string} type - Filter by notification type
 * @query {number} limit - Limit number of results
 * @query {number} skip - Skip number of results
 */
router.get('/', protect, getNotifications);

/**
 * GET /api/notifications/unread-count
 * Gets the count of unread notifications.
 */
router.get('/unread-count', protect, getUnreadCount);

/**
 * PATCH /api/notifications/:id/read
 * Marks a specific notification as read.
 */
router.patch('/:id/read', protect, markAsRead);

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications as read for the authenticated user.
 */
router.patch('/read-all', protect, markAllAsRead);

/**
 * PATCH /api/notifications/unread-all
 * Marks all notifications as unread for the authenticated user.
 */
router.patch('/unread-all', protect, markAllAsUnread);

/**
 * PATCH /api/notifications/:id/unread
 * Marks a specific notification as unread.
 * NOTE: This must come after /unread-all to avoid route conflicts
 */
router.patch('/:id/unread', protect, markAsUnread);

/**
 * DELETE /api/notifications
 * Deletes all notifications for the authenticated user.
 */
router.delete('/', protect, deleteAll);

export default router;

