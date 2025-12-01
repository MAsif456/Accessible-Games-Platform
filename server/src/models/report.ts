import mongoose, { Schema, Document } from 'mongoose';

export type ReportType = 'general' | 'game' | 'review';

export interface ReportDocument extends Document {
  type: ReportType;
  description?: string;
  transcript?: string;
  reporterId?: Schema.Types.ObjectId;
  game?: Schema.Types.ObjectId;
  review?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: Schema.Types.ObjectId;
  outcome?: 'kept' | 'deleted';
}

const reportSchema = new Schema<ReportDocument>(
  {
    type: { type: String, enum: ['general', 'game', 'review'], required: true },
    description: { type: String },
    transcript: { type: String },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User' },
    game: { type: Schema.Types.ObjectId, ref: 'Game' },
    review: { type: Schema.Types.ObjectId, ref: 'Review' },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    outcome: { type: String, enum: ['kept', 'deleted'] },
  },
  { timestamps: true }
);

export const ReportModel = mongoose.model<ReportDocument>('Report', reportSchema);
