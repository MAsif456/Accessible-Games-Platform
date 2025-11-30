import mongoose, { Schema, Document } from 'mongoose';

export type ReportType = 'general' | 'game' | 'review';

export interface ReportDocument extends Document {
  type: ReportType;
  description?: string;
  transcript?: string;
  game?: Schema.Types.ObjectId;
  review?: Schema.Types.ObjectId;
  createdAt: Date;
}

const reportSchema = new Schema<ReportDocument>(
  {
    type: { type: String, enum: ['general', 'game', 'review'], required: true },
    description: { type: String },
    transcript: { type: String },
    game: { type: Schema.Types.ObjectId, ref: 'Game' },
    review: { type: Schema.Types.ObjectId, ref: 'Review' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ReportModel = mongoose.model<ReportDocument>('Report', reportSchema);
