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
        const game: any = f.game;
        if (!game) return null;
        return {
          id: game._id.toString(),
          title: game.title,
          studio: game.studio,
          description: game.description,
          thumbnailUrl: game.thumbnailUrl,
          genres: game.genres,
          accessibilityTags: game.accessibilityTags,
        };
      })
      .filter(Boolean) as FavouriteGameDto[];

    return { items: games, total, page, pageSize };
  }

  async addFavourite(userId: string, gameId: string): Promise<FavouriteGameDto> {
    const game = await GameModel.findById(gameId).exec();
    if (!game) {
      throw new Error('Game not found');
    }

    const favourite = await favouritesRepository.addFavourite(userId, gameId);
    const favGame: any = (favourite as any).game || game;

    return {
      id: favGame._id.toString(),
      title: favGame.title,
      studio: favGame.studio,
      description: favGame.description,
      thumbnailUrl: favGame.thumbnailUrl,
      genres: favGame.genres,
      accessibilityTags: favGame.accessibilityTags,
    };
  }

  async removeFavourite(userId: string, gameId: string): Promise<void> {
    await favouritesRepository.removeFavourite(userId, gameId);
  }
}

const favouritesService = new FavouritesService();
export default favouritesService;
