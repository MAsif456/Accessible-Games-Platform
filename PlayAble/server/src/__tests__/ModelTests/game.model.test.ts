import GameModel, { seedGamesIfEmpty } from '../../models/game';

describe('game model utilities', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips seeding when games already exist', async () => {
    const countSpy = jest.spyOn(GameModel, 'countDocuments').mockResolvedValue(3 as any);
    const insertSpy = jest.spyOn(GameModel, 'insertMany').mockResolvedValue([] as any);

    await seedGamesIfEmpty();

    expect(countSpy).toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('inserts seed games when collection is empty', async () => {
    jest.spyOn(GameModel, 'countDocuments').mockResolvedValue(0 as any);
    const insertSpy = jest.spyOn(GameModel, 'insertMany').mockResolvedValue([] as any);

    await seedGamesIfEmpty();

    expect(insertSpy).toHaveBeenCalledTimes(1);
    const inserted = insertSpy.mock.calls[0][0] as any[];
    expect(Array.isArray(inserted)).toBe(true);
    expect(inserted.length).toBeGreaterThan(0);
  });
});
