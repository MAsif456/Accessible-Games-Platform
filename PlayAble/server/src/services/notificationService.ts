/**
 * Notification Service
 * Handles creation and management of user notifications.
 * @module notificationService
 */
import mongoose from 'mongoose';
import { NotificationModel, NotificationType, NotificationDocument } from '../models/notification';

/**
 * Creates a notification for a user.
 * @param userId - The user ID to notify
 * @param type - Type of notification
 * @param title - Notification title
 * @param message - Notification message
 * @param options - Additional options (reportId, reviewId, gameId, metadata)
 */
export async function createNotification(
  userId: string | mongoose.Types.ObjectId,
  type: NotificationType,
  title: string,
  message: string,
  options: {
    reportId?: string | mongoose.Types.ObjectId;
    reviewId?: string | mongoose.Types.ObjectId;
    gameId?: string | mongoose.Types.ObjectId;
    metadata?: Record<string, any>;
  } = {}
): Promise<NotificationDocument> {
  const userIdObj = typeof userId === 'string' 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  const notification = await NotificationModel.create({
    userId: userIdObj,
    type,
    title,
    message,
    read: false,
    reportId: options.reportId 
      ? (typeof options.reportId === 'string' ? new mongoose.Types.ObjectId(options.reportId) : options.reportId)
      : undefined,
    reviewId: options.reviewId
      ? (typeof options.reviewId === 'string' ? new mongoose.Types.ObjectId(options.reviewId) : options.reviewId)
      : undefined,
    gameId: options.gameId
      ? (typeof options.gameId === 'string' ? new mongoose.Types.ObjectId(options.gameId) : options.gameId)
      : undefined,
    metadata: options.metadata || {},
  });

  return notification;
}

/**
 * Gets all notifications for a user, sorted by most recent first.
 * @param userId - The user ID
 * @param options - Query options (read status, type filter, limit, skip)
 */
export async function getUserNotifications(
  userId: string | mongoose.Types.ObjectId,
  options: {
    read?: boolean;
    type?: NotificationType;
    limit?: number;
    skip?: number;
  } = {}
): Promise<NotificationDocument[]> {
  const userIdObj = typeof userId === 'string' 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  const query: any = { userId: userIdObj };
  
  if (options.read !== undefined) {
    query.read = options.read;
  }
  
  if (options.type) {
    query.type = options.type;
  }

  const notifications = await NotificationModel.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0)
    .lean()
    .exec();

  return notifications as any;
}

/**
 * Marks a notification as read.
 * @param notificationId - The notification ID
 * @param userId - The user ID (for security)
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string | mongoose.Types.ObjectId
): Promise<NotificationDocument | null> {
  const userIdObj = typeof userId === 'string' 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  const notification = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, userId: userIdObj },
    { read: true, readAt: new Date() },
    { new: true }
  );

  return notification;
}

/**
 * Marks all notifications as read for a user.
 * @param userId - The user ID
 */
export async function markAllNotificationsAsRead(
  userId: string | mongoose.Types.ObjectId
): Promise<void> {
  const userIdObj = typeof userId === 'string' 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  await NotificationModel.updateMany(
    { userId: userIdObj, read: false },
    { read: true, readAt: new Date() }
  );
}

/**
 * Gets the count of unread notifications for a user.
 * @param userId - The user ID
 */
export async function getUnreadNotificationCount(
  userId: string | mongoose.Types.ObjectId
): Promise<number> {
  const userIdObj = typeof userId === 'string' 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  return NotificationModel.countDocuments({ userId: userIdObj, read: false });
}

