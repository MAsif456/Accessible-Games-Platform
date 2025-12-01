import FavouriteModel, { IFavourite } from '../models/favourite';
import mongoose from 'mongoose';

export interface PaginatedFavourites {
  items: any[];
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
        .populate({ path: 'game', options: { lean: true } })
        .lean()
        .exec(),
      FavouriteModel.countDocuments({ user: userObjectId }),
    ]);

    return { items, total, page, pageSize };
  }

  async addFavourite(userId: string, gameId: string): Promise<IFavourite & { game?: any }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const gameObjectId = new mongoose.Types.ObjectId(gameId);

    const favourite = await FavouriteModel.findOneAndUpdate(
      { user: userObjectId, game: gameObjectId },
      { $setOnInsert: { user: userObjectId, game: gameObjectId } },
      { new: true, upsert: true }
    )
      .populate({ path: 'game', options: { lean: true } })
      .lean()
      .exec() as IFavourite & { game?: any } | null;

    if (!favourite) {
      throw new Error('Failed to add favourite');
    }

    return favourite as IFavourite & { game?: any };
  }

  async removeFavourite(userId: string, gameId: string): Promise<number> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const gameObjectId = new mongoose.Types.ObjectId(gameId);
    const result = await FavouriteModel.deleteOne({ user: userObjectId, game: gameObjectId }).exec();
    return result.deletedCount ?? 0;
  }
}

const favouritesRepository = new FavouritesRepository();
export default favouritesRepository;
