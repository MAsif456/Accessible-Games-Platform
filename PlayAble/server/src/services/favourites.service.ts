import favouritesRepository from '../repositories/favourites.repository';
import GameModel from '../models/game';

export interface FavouriteGameDto {
  id: string;
  title: string;
  studio: string;
  description: string;
  thumbnailUrl: string;
  genres: string[];
  accessibilityTags: string[];
}

export interface PaginatedFavouriteGames {
  items: FavouriteGameDto[];
  total: number;
  page: number;
  pageSize: number;
}

class FavouritesService {
  /**
   * Map a game document (populated or raw) to the DTO exposed to clients.
   */
  private toDto(game: any): FavouriteGameDto {
    return {
      id: game._id?.toString?.() ?? game.id,
      title: game.title,
      studio: game.studio,
      description: game.description,
      thumbnailUrl: game.thumbnailUrl,
      genres: game.genres,
      accessibilityTags: game.accessibilityTags,
    };
  }

  /**
   * Fetch paginated favourites for a user, with lean populated game docs.
   * @param {string} userId - User ID to fetch favourites for.
   * @param {number} page - Page number to fetch.
   * @param {number} pageSize - Number of items to fetch per page.
   * @returns {Promise<PaginatedFavouriteGames>} - Paginated favourites for user.
   */
  async getFavouritesForUser(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedFavouriteGames> {
    const { items, total } = await favouritesRepository.getFavouritesForUser(
      userId,
      page,
      pageSize
    );

    const games: FavouriteGameDto[] = items
      .map(f => {
        const game: any = (f as any).game;
        if (!game) return null;
        return this.toDto(game);
      })
      .filter(Boolean) as FavouriteGameDto[];

    return { items: games, total, page, pageSize };
  }


  /**
   * Add a game to the user's favourites list.
   * @param {string} userId - The user ID to add the favourite for.
   * @param {string} gameId - The game ID to add to the user's favourites list.
   * @returns {Promise<FavouriteGameDto>} - The added favourite game.
   * @throws {Error} - If the game to add was not found.
   */
  async addFavourite(userId: string, gameId: string): Promise<FavouriteGameDto> {
    const gameExists = await GameModel.exists({ _id: gameId });
    if (!gameExists) {
      throw new Error('Game not found');
    }

    const favourite = await favouritesRepository.addFavourite(userId, gameId);
    const favGame: any = (favourite as any).game;
    if (!favGame) {
      throw new Error('Game not found');
    }

    return this.toDto(favGame);
  }
  /**
   * Remove a favourite game.
   * @param {string} userId - The user ID to remove the favourite for.
   * @param {string} gameId - The game ID to remove from the user's favourites list.
   * @returns {Promise<number>} - The number of documents deleted.
   * @throws {Error} - If the game to remove was not found.
   */

  async removeFavourite(userId: string, gameId: string): Promise<number> {
    return favouritesRepository.removeFavourite(userId, gameId);
  }
}

const favouritesService = new FavouritesService();
export default favouritesService;
