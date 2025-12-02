import { Schema, model, Types, Document } from 'mongoose';
import crypto from 'crypto';

const generatePublicId = (): string => {
  return `rev_${crypto.randomBytes(4).toString('hex')}`;
};

export interface ReviewDocument extends Document {
  gameId: Types.ObjectId;
  userId: Types.ObjectId;
  authorName: string;
  body: string;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
  publicId: string;
  adminReply?: string;
  voiceTranscript?: string;
}

// Stores user-generated reviews for games; includes publicId for safer exposure.
const reviewSchema = new Schema<ReviewDocument>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    body: { type: String, required: true },
    likes: { type: Number, default: 0 },
    publicId: { type: String, unique: true, default: generatePublicId },
    adminReply: { type: String },
    voiceTranscript: { type: String },
  },
  { timestamps: true }
);

const Review = model<ReviewDocument>('Review', reviewSchema);

export default Review;
