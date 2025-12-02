/**
 * Notification Model
 * Mongoose schema and model for user notifications.
 * @module NotificationModel
 */
import mongoose, { Schema, Document } from 'mongoose';

/** Types of notifications */
export type NotificationType = 
  | 'report_submitted' 
  | 'report_resolved' 
  | 'review_deleted' 
  | 'review_liked';

/**
 * Mongoose document interface for notifications.
 * @interface NotificationDocument
 * @extends Document
 */
export interface NotificationDocument extends Document {
  /** User who receives this notification */
  userId: Schema.Types.ObjectId;
  /** Type of notification */
  type: NotificationType;
  /** Notification title */
  title: string;
  /** Notification message/content */
  message: string;
  /** Whether the notification has been read */
  read: boolean;
  /** Related report ID (if applicable) */
  reportId?: Schema.Types.ObjectId;
  /** Related review ID (if applicable) */
  reviewId?: Schema.Types.ObjectId;
  /** Related game ID (if applicable) */
  gameId?: Schema.Types.ObjectId;
  /** Additional metadata (e.g., reason for deletion, admin name, etc.) */
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
  /** Timestamp when the notification was created */
  createdAt: Date;
  /** Timestamp when the notification was read */
  readAt?: Date;
}

/**
 * Schema for user notifications.
 */
const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { 
      type: String, 
      enum: ['report_submitted', 'report_resolved', 'review_deleted', 'review_liked'], 
      required: true 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    reportId: { type: Schema.Types.ObjectId, ref: 'Report' },
    reviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game' },
    metadata: {
      reportCode: String,
      reportType: String,
      reviewContent: String,
      deletionReason: String,
      adminName: String,
      likedBy: String,
      gameTitle: String,
      gameSlug: String,
    },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

/** Mongoose model for notifications */
export const NotificationModel = mongoose.model<NotificationDocument>('Notification', notificationSchema);

