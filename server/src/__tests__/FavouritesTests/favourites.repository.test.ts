import mongoose from 'mongoose';
import FavouriteModel from '../../models/favourite';
import GameModel from '../../models/game';
import favouritesRepository from '../../repositories/favourites.repository';

describe('FavouritesRepository', () => {
  const userId = new mongoose.Types.ObjectId().toHexString();

  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/playable_test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await FavouriteModel.deleteMany({});
  });

  it('returns paginated favourites for a user', async () => {
    
    const games = await GameModel.insertMany(
      Array.from({ length: 10 }, (_, i) => ({
        title: `Game ${i + 1}`,
        studio: `Studio ${i + 1}`,
        description: `Description ${i + 1}`,
        thumbnailUrl: `/images/games/thumb-${i + 1}.jpg`,
        genres: ['Action'],
        accessibilityTags: ['Vision'],
        slug: `game-${i + 1}` 
      })),
    );

    await FavouriteModel.insertMany(
      games.map(g => ({ user: userId, game: g._id })),
    );

   
    const insertedFavourites = await FavouriteModel.find({ user: userId }).populate('game').exec();
    console.log('Inserted Favourites:', insertedFavourites);

    
    const page1 = await favouritesRepository.getFavouritesForUser(userId, 1, 9);

    
    expect(page1.items).toHaveLength(9);
    expect(page1.total).toBe(10);
    expect(page1.page).toBe(1);
    expect(page1.pageSize).toBe(9);
  });

     it('removes a favourite using ObjectIds and pulls next item into first page', async () => {
    
    const games = await GameModel.insertMany(
      Array.from({ length: 10 }, (_, i) => ({
        title: `Delete Test Game ${i + 1}`,
        studio: `Studio ${i + 1}`,
        description: `Description ${i + 1}`,
        thumbnailUrl: `/images/games/thumb-${i + 1}.jpg`,
        genres: ['Action'],
        accessibilityTags: ['Vision'],
        slug: `delete-test-game-${i + 1}`,
      })),
    );

    await FavouriteModel.insertMany(
      games.map(g => ({ user: userId, game: g._id })),
    );

    
    const before = await favouritesRepository.getFavouritesForUser(userId, 1, 9);
    expect(before.total).toBe(10);
    expect(before.items).toHaveLength(9);

    
    const gameIdToDelete = before.items[0].game._id.toString();
    
    await favouritesRepository.removeFavourite(userId, gameIdToDelete);

    const after = await favouritesRepository.getFavouritesForUser(userId, 1, 9);


    expect(after.total).toBe(9);
    expect(after.items).toHaveLength(9);
    expect(after.items.some(f => f.game._id.toString() === gameIdToDelete)).toBe(false);  });

  test('addFavourite and getFavouritesForUser support pagination', async () => {
  
    for (let i = 0; i < 10; i++) {
      await favouritesRepository.addFavourite(userId, new mongoose.Types.ObjectId().toString());
    }

    const page1 = await favouritesRepository.getFavouritesForUser(userId, 1, 9);
    expect(page1.items).toHaveLength(9);
    expect(page1.total).toBe(10);

    const page2 = await favouritesRepository.getFavouritesForUser(userId, 2, 9);
    expect(page2.items).toHaveLength(1);
  });

  test('removeFavourite deletes a favourite and compacts pagination', async () => {
    const gameIds = Array.from({ length: 10 }, () => new mongoose.Types.ObjectId().toString());

    for (const gid of gameIds) {
      await favouritesRepository.addFavourite(userId, gid);
    }

  
    await favouritesRepository.removeFavourite(userId, gameIds[0]);

    const page1 = await favouritesRepository.getFavouritesForUser(userId, 1, 9);
    expect(page1.items).toHaveLength(9);
    expect(page1.total).toBe(9);
  });
});
