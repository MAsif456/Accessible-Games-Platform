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

  async removeFavourite(userId: string, gameId: string): Promise<number> {
    return favouritesRepository.removeFavourite(userId, gameId);
  }
}

const favouritesService = new FavouritesService();
export default favouritesService;
