import mongoose, { Document, Schema } from 'mongoose';
import gamesData from '../../data/games.json';

export interface IGame extends Document {
  slug: string;
  title: string;
  studio: string;
  description: string;
  thumbnailUrl: string;
  genres: string[];
  accessibilityTags: string[];
  specificAccessibilityTags?: Record<string, string[]>;
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
    specificAccessibilityTags: {
      type: Map,
      of: [String],
      default: undefined,
    },
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

export async function seedGamesIfEmpty() {
  const count = await GameModel.countDocuments();
  if (count > 0) return;

  const gamesToInsert = (gamesData as any[]).map(g => ({
    slug: g.slug,
    title: g.title,
    studio: g.studio,
    description: g.description,
    thumbnailUrl: g.thumbnailUrl,
    genres: g.genres,
    accessibilityTags: g.accessibilityTags,
    specificAccessibilityTags: g.specificAccessibilityTags,
    releaseYear: g.releaseYear,
    isPublished: g.isPublished ?? true,
  }));

  await GameModel.insertMany(gamesToInsert);
}

export async function syncSpecificAccessibilityTags() {
  const operations = (gamesData as any[]).flatMap(g => {
    if (g.specificAccessibilityTags) {
      return [
        {
          updateOne: {
            filter: { slug: g.slug },
            update: { $set: { specificAccessibilityTags: g.specificAccessibilityTags } },
          },
        },
      ];
    }
    return [];
  });

  if (operations.length > 0) {
    await GameModel.bulkWrite(operations);
  }
}
