import { Schema, model, Types, Document } from 'mongoose';

export interface ReviewDocument extends Document {
  gameId: Types.ObjectId;
  userId: Types.ObjectId;
  authorName: string;
  body: string;
  likes: number;
  publicId: string;
  createdAt: Date;
  updatedAt: Date;
}

const generatePublicId = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `REV-${suffix}`;
};

const reviewSchema = new Schema<ReviewDocument>(
  {
    publicId: {
      type: String,
      unique: true,
      index: true,
      default: generatePublicId,
    },
    gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    body: { type: String, required: true },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

reviewSchema.pre('validate', function ensurePublicId(next) {
  if (!this.publicId) {
    this.publicId = generatePublicId();
  }
  next();
});

const Review = model<ReviewDocument>('Review', reviewSchema);

export default Review;
export async function ensureReviewPublicIds() {
  const orphaned = await Review.find({
    $or: [{ publicId: { $exists: false } }, { publicId: null }, { publicId: '' }],
  }).select('_id publicId');

  if (!orphaned.length) return;

  for (const doc of orphaned) {
    let candidate = generatePublicId();
    // eslint-disable-next-line no-await-in-loop
    while (await Review.exists({ publicId: candidate })) {
      candidate = generatePublicId();
    }
    // eslint-disable-next-line no-await-in-loop
    await Review.updateOne({ _id: doc._id }, { publicId: candidate });
  }
}
