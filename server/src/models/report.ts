import mongoose, { Schema, Document } from 'mongoose';

export type ReportType = 'general' | 'game' | 'review';

export interface AdminReply {
  message: string;
  adminId?: Schema.Types.ObjectId;
  adminName?: string;
  createdAt: Date;
}

export interface ReportDocument extends Document {
  type: ReportType;
  description?: string;
  transcript?: string;
  reporterId?: Schema.Types.ObjectId;
  reporterName?: string;
  reporterEmail?: string;
  game?: Schema.Types.ObjectId;
  review?: Schema.Types.ObjectId;
  status: 'open' | 'resolved';
  adminReplies: AdminReply[];
  resolvedAt?: Date;
  createdAt: Date;
}

const adminReplySchema = new Schema<AdminReply>(
  {
    message: { type: String, required: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
    adminName: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const reportSchema = new Schema<ReportDocument>(
  {
    type: { type: String, enum: ['general', 'game', 'review'], required: true },
    description: { type: String },
    transcript: { type: String },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User' },
    reporterName: { type: String },
    reporterEmail: { type: String },
    game: { type: Schema.Types.ObjectId, ref: 'Game' },
    review: { type: Schema.Types.ObjectId, ref: 'Review' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    adminReplies: { type: [adminReplySchema], default: [] },
    resolvedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ReportModel = mongoose.model<ReportDocument>('Report', reportSchema);
