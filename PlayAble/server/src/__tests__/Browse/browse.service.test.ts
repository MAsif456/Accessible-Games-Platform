import { getPaginatedGames, getGamesMetadata, resetGamesMetadataCache } from '../../../services/games.service';

jest.mock('../../models', () => {
  const distinct = jest.fn();
  const countDocuments = jest.fn();
  const find = jest.fn();
  return { GameModel: { distinct, countDocuments, find } };
});

import { GameModel } from '../../models';

const mockGameModel = GameModel as unknown as {
  distinct: jest.Mock;
  countDocuments: jest.Mock;
  find: jest.Mock;
};

describe('Games service (browse)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGamesMetadataCache();

    mockGameModel.countDocuments.mockResolvedValue(2);

    const chain: any = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: '1',
          slug: 'alpha',
          title: 'Alpha',
          studio: 'Studio A',
          description: 'Desc',
          thumbnailUrl: '/alpha.png',
          genres: ['Action'],
          accessibilityTags: ['Tag1'],
          releaseYear: 2021,
          isPublished: true,
        },
      ]),
    };

    mockGameModel.find.mockReturnValue(chain);
  });

  it('short-circuits when search is invalid and avoids DB calls', async () => {
    const result = await getPaginatedGames({
      search: '__MATCH_NOTHING__',
      page: 1,
      pageSize: 10,
      genres: [],
      tags: [],
      sort: 'title_asc',
    });

    expect(result.games).toEqual([]);
    expect(result.totalResults).toBe(0);
    expect(mockGameModel.countDocuments).not.toHaveBeenCalled();
    expect(mockGameModel.find).not.toHaveBeenCalled();
  });

  it('applies filters, pagination and sorting when fetching games', async () => {
    await getPaginatedGames({
      search: 'Action',
      page: 2,
      pageSize: 5,
      genres: ['Action'],
      tags: ['Tag1'],
      sort: 'title_desc',
    });

    expect(mockGameModel.find).toHaveBeenCalledTimes(1);
    const calls = mockGameModel.find.mock.calls as unknown[][];
    const filterArg = calls[0]?.[0];
    expect(filterArg).toBeDefined();

    expect(filterArg as any).toMatchObject({
      isPublished: true,
      genres: { $all: ['Action'] },
      accessibilityTags: { $all: ['Tag1'] },
    });
    expect((filterArg as any).$or).toBeDefined();
  });

  it('caches metadata and reuses it within TTL unless bypassed', async () => {
    mockGameModel.distinct
      .mockResolvedValueOnce(['Action'])
      .mockResolvedValueOnce(['Tag1', 'Tag2'])
      .mockResolvedValueOnce([2021, 2020])
      .mockResolvedValueOnce(['Action'])
      .mockResolvedValueOnce(['Tag1', 'Tag2'])
      .mockResolvedValueOnce([2021, 2020]);

    const first = await getGamesMetadata();
    expect(first.genres).toEqual(['Action']);
    expect(mockGameModel.distinct).toHaveBeenCalledTimes(3);

    const second = await getGamesMetadata();
    expect(second.genres).toEqual(['Action']);
    expect(mockGameModel.distinct).toHaveBeenCalledTimes(3);

    await getGamesMetadata({ useCache: false });
    expect(mockGameModel.distinct).toHaveBeenCalledTimes(6);
  }, 10000);
});
