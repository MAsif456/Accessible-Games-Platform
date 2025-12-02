/**
 * Report Model
 * Mongoose schema and model for user-submitted reports (general, game, or review).
 * @module ReportModel
 */
import mongoose, { Schema, Document } from 'mongoose';

/** The type of report submitted by a user */
export type ReportType = 'general' | 'game' | 'review';

/**
 * Represents an admin's reply to a report.
 * @interface AdminReply
 */
export interface AdminReply {
  /** The reply message content */
  message: string;
  /** ObjectId of the admin who replied */
  adminId?: Schema.Types.ObjectId;
  /** Display name of the admin */
  adminName?: string;
  /** Timestamp when the reply was created */
  createdAt: Date;
}

/**
 * Mongoose document interface for reports.
 * @interface ReportDocument
 * @extends Document
 */
export interface ReportDocument extends Document {
  /** Type of report: general, game, or review */
  type: ReportType;
  /** The report description/content */
  description?: string;
  /** Voice transcript if submitted via voice input */
  transcript?: string;
  /** Optional categorisation for game reports */
  issueType?: string;
  /** ObjectId of the user who submitted the report */
  reporterId?: Schema.Types.ObjectId;
  /** Display name of the reporter */
  reporterName?: string;
  /** Email address of the reporter */
  reporterEmail?: string;
  /** Reference to the game being reported (for game/review reports) */
  game?: Schema.Types.ObjectId;
  /** Reference to the review being reported (for review reports) */
  review?: Schema.Types.ObjectId;
  /** Current status of the report */
  status: 'open' | 'resolved';
  /** Array of admin replies to this report */
  adminReplies: AdminReply[];
  /** Timestamp when the report was resolved */
  resolvedAt?: Date;
  /** Admin who resolved the report */
  resolvedBy?: Schema.Types.ObjectId;
  /** Timestamp when the report was created */
  createdAt: Date;
}

/**
 * Schema for admin replies embedded in reports.
 */
const adminReplySchema = new Schema<AdminReply>(
  {
    message: { type: String, required: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
    adminName: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * Schema for user-submitted reports.
 * Supports general feedback, game reports, and review reports.
 */
const reportSchema = new Schema<ReportDocument>(
  {
    type: { type: String, enum: ['general', 'game', 'review'], required: true },
    description: { type: String },
    transcript: { type: String },
    issueType: { type: String },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User' },
    reporterName: { type: String },
    reporterEmail: { type: String },
    game: { type: Schema.Types.ObjectId, ref: 'Game' },
    review: { type: Schema.Types.ObjectId, ref: 'Review' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    adminReplies: { type: [adminReplySchema], default: [] },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

/** Mongoose model for reports */
export const ReportModel = mongoose.model<ReportDocument>('Report', reportSchema);
