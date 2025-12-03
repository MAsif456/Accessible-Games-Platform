/**
 * Notifications Controller
 * Handles HTTP requests for user notifications.
 * @module notificationsController
 */
import { Request, Response } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from '../services/notificationService';

/**
 * Transforms a notification document to the API response format.
 */
const toNotificationDto = (notification: any) => ({
  id: notification._id.toString(),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  read: notification.read,
  reportId: notification.reportId?.toString(),
  reviewId: notification.reviewId?.toString(),
  gameId: notification.gameId?.toString(),
  metadata: notification.metadata || {},
  createdAt: notification.createdAt?.toISOString() || new Date().toISOString(),
  readAt: notification.readAt?.toISOString(),
});

/**
 * GET /api/notifications
 * Gets all notifications for the authenticated user.
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { read, type, limit, skip } = req.query;
    
    const notifications = await getUserNotifications(userId, {
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      type: type as any,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      skip: skip ? parseInt(skip as string, 10) : undefined,
    });

    // Transform notifications to DTO format
    const notificationDtos = notifications.map(toNotificationDto);

    return res.json({ success: true, notifications: notificationDtos });
  } catch (error) {
    console.error('Error fetching notifications', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

/**
 * GET /api/notifications/unread-count
 * Gets the count of unread notifications for the authenticated user.
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const count = await getUnreadNotificationCount(userId);
    return res.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching unread count', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a specific notification as read.
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { id } = req.params;
    const notification = await markNotificationAsRead(id, userId);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, notification: toNotificationDto(notification) });
  } catch (error) {
    console.error('Error marking notification as read', error);
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications as read for the authenticated user.
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    await markAllNotificationsAsRead(userId);
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read', error);
    return res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
  }
};

