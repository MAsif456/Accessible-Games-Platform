import mongoose, { Document, Schema } from 'mongoose';

export interface IFavourite extends Document {
  user: mongoose.Types.ObjectId;
  game: mongoose.Types.ObjectId;
  createdAt: Date;
}

// Stores user <-> game favourites with unique constraint to avoid duplicates.
const FavouriteSchema = new Schema<IFavourite>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'favourites',
  }
);

FavouriteSchema.index({ user: 1, game: 1 }, { unique: true });

const FavouriteModel =
  mongoose.models.Favourite || mongoose.model<IFavourite>('Favourite', FavouriteSchema);

export default FavouriteModel;
