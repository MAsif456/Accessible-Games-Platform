import FavouriteModel, { IFavourite } from '../models/favourite';
import GameModel from '../models/game';
import mongoose from 'mongoose';

export interface PaginatedFavourites {
  items: IFavourite[];
  total: number;
  page: number;
  pageSize: number;
}

export class FavouritesRepository {
  async getFavouritesForUser(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedFavourites> {
    const skip = (page - 1) * pageSize;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [items, total] = await Promise.all([
      FavouriteModel.find({ user: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('game')
        .exec(),
      FavouriteModel.countDocuments({ user: userObjectId }),
    ]);

    return { items, total, page, pageSize };
  }

  async addFavourite(userId: string, gameId: string): Promise<IFavourite> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const gameObjectId = new mongoose.Types.ObjectId(gameId);

    const favourite = await FavouriteModel.findOneAndUpdate(
      { user: userObjectId, game: gameObjectId },
      { $setOnInsert: { user: userObjectId, game: gameObjectId } },
      { new: true, upsert: true }
    ).exec();

    if (!favourite) {
      throw new Error('Failed to add favourite');
    }

    return favourite;
  }

  async removeFavourite(userId: string, gameId: string): Promise<void> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const gameObjectId = new mongoose.Types.ObjectId(gameId);
    await FavouriteModel.deleteOne({ user: userObjectId, game: gameObjectId }).exec();
  }
}

const favouritesRepository = new FavouritesRepository();
export default favouritesRepository;
