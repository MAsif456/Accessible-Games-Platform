import { Schema, model, Types, Document } from 'mongoose';

export interface ReviewDocument extends Document {
  gameId: Types.ObjectId;
  userId: Types.ObjectId;
  authorName: string;
  body: string;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    body: { type: String, required: true },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Review = model<ReviewDocument>('Review', reviewSchema);

export default Review;