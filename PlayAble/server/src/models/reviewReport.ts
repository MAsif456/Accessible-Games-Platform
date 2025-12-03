import { Schema, model, Types, Document } from 'mongoose';

export type ReviewReportOutcome = 'kept' | 'deleted';

export interface ReviewReportDocument extends Document {
  reviewId: Types.ObjectId;
  reporterId: Types.ObjectId;
  reasonText: string;
  voiceTranscript?: string;
  createdAt: Date;
  updatedAt: Date;
  adminReply?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  outcome?: ReviewReportOutcome;
}

// Legacy review report model; newer reports may also live in ReportModel.
const reviewReportSchema = new Schema<ReviewReportDocument>(
  {
    reviewId: { type: Schema.Types.ObjectId, ref: 'Review', required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reasonText: { type: String, required: true },
    voiceTranscript: { type: String },
    adminReply: { type: String },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    outcome: { type: String, enum: ['kept', 'deleted'], default: undefined },
  },
  { timestamps: true }
);

const ReviewReport = model<ReviewReportDocument>('ReviewReport', reviewReportSchema);

export default ReviewReport;
