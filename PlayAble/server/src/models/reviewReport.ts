import { Schema, model, Types, Document } from 'mongoose';

export interface ReviewReportDocument extends Document {
  reviewId: Types.ObjectId;
  reporterId: Types.ObjectId;
  reasonText: string;
  voiceTranscript?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewReportSchema = new Schema<ReviewReportDocument>(
  {
    reviewId: { type: Schema.Types.ObjectId, ref: 'Review', required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reasonText: { type: String, required: true },
    voiceTranscript: { type: String },
  },
  { timestamps: true }
);

const ReviewReport = model<ReviewReportDocument>('ReviewReport', reviewReportSchema);

export default ReviewReport;