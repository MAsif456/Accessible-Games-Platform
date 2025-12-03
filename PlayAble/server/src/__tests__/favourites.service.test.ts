import favouritesService from '../services/favourites.service';
import favouritesRepository from '../repositories/favourites.repository';
import GameModel from '../models/game';

jest.mock('../repositories/favourites.repository', () => ({
  __esModule: true,
  default: {
    getFavouritesForUser: jest.fn(),
    addFavourite: jest.fn(),
    removeFavourite: jest.fn(),
  },
}));

jest.mock('../models/game', () => ({
  __esModule: true,
  default: { exists: jest.fn() },
}));

const repo = favouritesRepository as unknown as {
  getFavouritesForUser: jest.Mock;
  addFavourite: jest.Mock;
  removeFavourite: jest.Mock;
};

const gameModel = GameModel as unknown as { exists: jest.Mock };

describe('favouritesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps favourites to DTOs', async () => {
    repo.getFavouritesForUser.mockResolvedValue({
      items: [{ game: { _id: 'g1', title: 'T', studio: 'S', description: 'D', thumbnailUrl: 'img', genres: [], accessibilityTags: [] } }],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const result = await favouritesService.getFavouritesForUser('u1', 1, 10);
    expect(result.items[0].id).toBe('g1');
  });

  it('adds favourite when game exists', async () => {
    gameModel.exists.mockResolvedValue(true);
    repo.addFavourite.mockResolvedValue({
      game: { _id: 'g2', title: 'T', studio: 'S', description: 'D', thumbnailUrl: 'img', genres: [], accessibilityTags: [] },
    });
    const fav = await favouritesService.addFavourite('u1', 'g2');
    expect(fav.id).toBe('g2');
  });

  it('throws when adding favourite and game missing', async () => {
    gameModel.exists.mockResolvedValue(false);
    await expect(favouritesService.addFavourite('u1', 'missing')).rejects.toThrow('Game not found');
  });

  it('removes favourite', async () => {
    repo.removeFavourite.mockResolvedValue(1);
    const count = await favouritesService.removeFavourite('u1', 'g3');
    expect(count).toBe(1);
  });
});
