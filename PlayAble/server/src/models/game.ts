import mongoose, { Document, Schema } from 'mongoose';

export interface IGame extends Document {
  slug: string;
  title: string;
  studio: string;
  description: string;
  thumbnailUrl: string;
  genres: string[];
  accessibilityTags: string[];
  releaseYear?: number;
  isPublished: boolean;
}

const GameSchema = new Schema<IGame>(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    studio: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    genres: { type: [String], required: true, default: [] },
    accessibilityTags: { type: [String], required: true, default: [] },
    releaseYear: { type: Number },
    isPublished: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    collection: 'games',
  }
);

const GameModel = mongoose.models.Game || mongoose.model<IGame>('Game', GameSchema);

export default GameModel;
