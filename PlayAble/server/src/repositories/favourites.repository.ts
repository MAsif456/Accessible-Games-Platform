import FavouriteModel, { IFavourite } from '../models/favourite';
import mongoose from 'mongoose';

export interface PaginatedFavourites {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
}

export class FavouritesRepository {
  
  /**
   * Fetch paginated favourites for a user, with lean populated game docs.
   * @param {string} userId - User ID to fetch favourites for.
   * @param {number} page - Page number to fetch.
   * @param {number} pageSize - Number of items to fetch per page.
   * @returns {Promise<PaginatedFavourites>} - Paginated favourites for user.
   */
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


  /**
   * Upsert a favourite and populate the game.
   * @param {string} userId - User ID to add favourite for.
   * @param {string} gameId - Game ID to favourite.
   * @returns {Promise<IFavourite & { game?: any }>} - Added favourite with populated game doc.
   * @throws {Error} - If failed to add favourite.
   */
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

  /**
    * Remove a favourite; returns deleted count for caller to decide 404 vs 204.
    */
  async removeFavourite(userId: string, gameId: string): Promise<number> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const gameObjectId = new mongoose.Types.ObjectId(gameId);
    const result = await FavouriteModel.deleteOne({ user: userObjectId, game: gameObjectId }).exec();
    return result.deletedCount ?? 0;
  }
}

const favouritesRepository = new FavouritesRepository();
export default favouritesRepository;
