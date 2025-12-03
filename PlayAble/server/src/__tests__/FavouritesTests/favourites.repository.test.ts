import mongoose from 'mongoose';
import FavouriteModel from '../../models/favourite';
import GameModel from '../../models/game';
import favouritesRepository from '../../repositories/favourites.repository';
import dotenv from 'dotenv';

// Load environment variables (same as server)
dotenv.config();

jest.setTimeout(20000);

describe('FavouritesRepository', () => {
  const userId = new mongoose.Types.ObjectId().toHexString();

  beforeAll(async () => {
    // Disconnect any existing connections first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Connect to test database with timeout
    // Use the same connection string as the server, but with test database name
    const serverMongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/playabledb';
    // Replace database name with test database
    const mongoUri = serverMongoUri.replace(/\/[^\/]+$/, '/playable_test');
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
      });
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      console.error('Make sure MongoDB is running on localhost:27017');
      console.error('The server uses:', process.env.MONGODB_URI || 'mongodb://localhost:27017/playabledb');
      throw error;
    }
  }, 15000); // 15 second timeout

  afterAll(async () => {
    // Clean up test database
    try {
      await mongoose.connection.dropDatabase();
      // Only close if we opened the connection in this test
      if (mongoose.connection.readyState === 1 && mongoose.connection.name === 'playable_test') {
        await mongoose.connection.close();
      }
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
  }, 10000);

  beforeEach(async () => {
    await GameModel.deleteMany({});
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

    const page1 = await favouritesRepository.getFavouritesForUser(userId, 1, 9);

    expect(page1.items).toHaveLength(9);
    expect(page1.total).toBe(10);
    expect(page1.page).toBe(1);
    expect(page1.pageSize).toBe(9);
    // Lean populated docs still include the game fields
    expect((page1.items[0] as any).game.title).toBeDefined();
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

  
    const deletedCount = await favouritesRepository.removeFavourite(userId, gameIds[0]);
    expect(deletedCount).toBe(1);

    const page1 = await favouritesRepository.getFavouritesForUser(userId, 1, 9);
    expect(page1.items).toHaveLength(9);
    expect(page1.total).toBe(9);
  });

  test('removeFavourite returns 0 when nothing is deleted', async () => {
    const deleted = await favouritesRepository.removeFavourite(
      userId,
      new mongoose.Types.ObjectId().toHexString(),
    );
    expect(deleted).toBe(0);
  });
});
