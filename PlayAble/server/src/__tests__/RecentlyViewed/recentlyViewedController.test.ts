/**
 * Recently Viewed Controller - Complete Test Coverage
 * Tests all recently viewed functionality: add, get, clear
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  addToRecentlyViewed,
  getRecentlyViewed,
  clearRecentlyViewed,
} from '../../controllers/recentlyViewedController';
import UserModel from '../../models/user';
import GameModel from '../../models/game';

// Mock dependencies
jest.mock('../../models/user');
jest.mock('../../models/game');

// Mock data
const mockUserId = new mongoose.Types.ObjectId();
const mockGameId = new mongoose.Types.ObjectId();
const mockGameId2 = new mongoose.Types.ObjectId();

const mockGame = {
  _id: mockGameId,
  slug: 'test-game',
  title: 'Test Game',
  studio: 'Test Studio',
  description: 'A test game',
  thumbnailUrl: '/images/test.jpg',
  genres: ['Action'],
  accessibilityTags: ['Subtitles'],
  releaseYear: 2024,
  isPublished: true,
};

const mockGame2 = {
  _id: mockGameId2,
  slug: 'test-game-2',
  title: 'Test Game 2',
  studio: 'Test Studio 2',
  description: 'Another test game',
  thumbnailUrl: '/images/test2.jpg',
  genres: ['RPG'],
  accessibilityTags: [],
  releaseYear: 2023,
  isPublished: true,
};

const mockUser = {
  _id: mockUserId,
  name: 'Test User',
  email: 'test@example.com',
  recentlyViewed: [],
  save: jest.fn().mockResolvedValue(true),
};

// Helper functions
const createMockReq = (user?: any, params?: any, body?: any): Partial<Request> => ({
  user,
  params: params || {},
  body: body || {},
});

const createMockRes = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

describe('Recently Viewed Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('addToRecentlyViewed', () => {
    describe('Successful Addition', () => {
      it('should add game to empty recently viewed list', async () => {
        const req = createMockReq(
          { id: mockUserId.toString() },
          { gameId: mockGameId.toString() }
        ) as Request;
        const res = createMockRes() as Response;

        const userWithSave = { ...mockUser, recentlyViewed: [], save: jest.fn().mockResolvedValue(true) };
        (UserModel.findById as jest.Mock).mockResolvedValue(userWithSave);

        await addToRecentlyViewed(req, res);

        expect(UserModel.findById).toHaveBeenCalledWith(mockUserId.toString());
        expect(userWithSave.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
          recentlyViewed: expect.arrayContaining([
            expect.objectContaining({
              gameId: expect.any(mongoose.Types.ObjectId),
              viewedAt: expect.any(Date),
            }),
          ]),
        });
      });

      it('should add game to front of existing list', async () => {
        const existingEntry = {
          gameId: mockGameId2,
          viewedAt: new Date('2024-01-01'),
        };

        const req = createMockReq(
          { id: mockUserId.toString() },
          { gameId: mockGameId.toString() }
        ) as Request;
        const res = createMockRes() as Response;

        const userWithSave = {
          ...mockUser,
          recentlyViewed: [existingEntry],
          save: jest.fn().mockResolvedValue(true),
        };
        (UserModel.findById as jest.Mock).mockResolvedValue(userWithSave);

        await addToRecentlyViewed(req, res);

        expect(userWithSave.save).toHaveBeenCalled();
        const response = (res.json as jest.Mock).mock.calls[0][0];
        expect(response.recentlyViewed).toHaveLength(2);
        expect(response.recentlyViewed[0].gameId.toString()).toBe(mockGameId.toString());
      });

      it('should move existing game to front when viewed again', async () => {
        const existingEntry1 = {
          gameId: mockGameId,
          viewedAt: new Date('2024-01-01'),
        };
        const existingEntry2 = {
          gameId: mockGameId2,
          viewedAt: new Date('2024-01-02'),
        };

        const req = createMockReq(
          { id: mockUserId.toString() },
          { gameId: mockGameId.toString() }
        ) as Request;
        const res = createMockRes() as Response;

        const userWithSave = {
          ...mockUser,
          recentlyViewed: [existingEntry2, existingEntry1],
          save: jest.fn().mockResolvedValue(true),
        };
        (UserModel.findById as jest.Mock).mockResolvedValue(userWithSave);

        await addToRecentlyViewed(req, res);

        const response = (res.json as jest.Mock).mock.calls[0][0];
        expect(response.recentlyViewed).toHaveLength(2);
        expect(response.recentlyViewed[0].gameId.toString()).toBe(mockGameId.toString());
        expect(response.recentlyViewed[0].viewedAt.getTime()).toBeGreaterThan(
          new Date('2024-01-02').getTime()
        );
      });

      it('should limit list to 50 games maximum', async () => {
        const req = createMockReq(
          { id: mockUserId.toString() },
          { gameId: mockGameId.toString() }
        ) as Request;
        const res = createMockRes() as Response;

        // Create 50 existing entries
        const existing = Array.from({ length: 50 }, (_, i) => ({
          gameId: new mongoose.Types.ObjectId(),
          viewedAt: new Date(`2024-01-${(i + 1).toString().padStart(2, '0')}`),
        }));

        const userWithSave = {
          ...mockUser,
          recentlyViewed: existing,
          save: jest.fn().mockResolvedValue(true),
        };
        (UserModel.findById as jest.Mock).mockResolvedValue(userWithSave);

        await addToRecentlyViewed(req, res);

        const response = (res.json as jest.Mock).mock.calls[0][0];
        expect(response.recentlyViewed).toHaveLength(50);
        expect(response.recentlyViewed[0].gameId.toString()).toBe(mockGameId.toString());
      });
    });

    describe('Validation and Errors', () => {
      it('should reject request without user authentication', async () => {
        const req = createMockReq(undefined, { gameId: mockGameId.toString() }) as Request;
        const res = createMockRes() as Response;

        await addToRecentlyViewed(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorised' });
        expect(UserModel.findById).not.toHaveBeenCalled();
      });

      it('should reject invalid game ID format', async () => {
        const req = createMockReq({ id: mockUserId.toString() }, { gameId: 'invalid-id' }) as Request;
        const res = createMockRes() as Response;

        await addToRecentlyViewed(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid game id' });
      });

      it('should return 404 if user not found', async () => {
        const req = createMockReq(
          { id: mockUserId.toString() },
          { gameId: mockGameId.toString() }
        ) as Request;
        const res = createMockRes() as Response;

        (UserModel.findById as jest.Mock).mockResolvedValue(null);

        await addToRecentlyViewed(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      });

      it('should handle database errors gracefully', async () => {
        const req = createMockReq(
          { id: mockUserId.toString() },
          { gameId: mockGameId.toString() }
        ) as Request;
        const res = createMockRes() as Response;

        (UserModel.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

        await addToRecentlyViewed(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Failed to update recently viewed' });
      });
    });
  });

  describe('getRecentlyViewed', () => {
    describe('Successful Retrieval', () => {
      it('should return recently viewed games with full details', async () => {
        const req = createMockReq({ id: mockUserId.toString() }) as Request;
        const res = createMockRes() as Response;

        const userWithGames = {
          ...mockUser,
          recentlyViewed: [
            { gameId: mockGameId, viewedAt: new Date('2024-01-02') },
            { gameId: mockGameId2, viewedAt: new Date('2024-01-01') },
          ],
        };

        (UserModel.findById as jest.Mock).mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithGames),
        });
        (GameModel.find as jest.Mock).mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockGame, mockGame2]),
        });

        await getRecentlyViewed(req, res);

        expect(UserModel.findById).toHaveBeenCalledWith(mockUserId.toString());
        expect(GameModel.find).toHaveBeenCalledWith({
          _id: { $in: [mockGameId, mockGameId2] },
        });
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            games: expect.any(Array),
            total: 2,
            showing: '1-2 of 2',
          })
        );
      });

      it('should order games by most recently viewed first', async () => {
        const req = createMockReq({ id: mockUserId.toString() }) as Request;
        const res = createMockRes() as Response;

        const userWithGames = {
          ...mockUser,
          recentlyViewed: [
            { gameId: mockGameId2, viewedAt: new Date('2024-01-01') },
            { gameId: mockGameId, viewedAt: new Date('2024-01-02') },
          ],
        };

        (UserModel.findById as jest.Mock).mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithGames),
        });
        (GameModel.find as jest.Mock).mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockGame, mockGame2]),
        });

        await getRecentlyViewed(req, res);

        const response = (res.json as jest.Mock).mock.calls[0][0];
        expect(response.games[0].slug).toBe('test-game');
        expect(response.games[1].slug).toBe('test-game-2');
      });

      it('should return empty array when no games viewed', async () => {
        const req = createMockReq({ id: mockUserId.toString() }) as Request;
        const res = createMockRes() as Response;

        const userWithNoGames = {
          ...mockUser,
          recentlyViewed: [],
        };

        (UserModel.findById as jest.Mock).mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithNoGames),
        });

        await getRecentlyViewed(req, res);

        expect(res.json).toHaveBeenCalledWith({
          games: [],
          total: 0,
          showing: '0 of 0',
        });
        expect(GameModel.find).not.toHaveBeenCalled();
      });

      it('should handle missing recentlyViewed field', async () => {
        const req = createMockReq({ id: mockUserId.toString() }) as Request;
        const res = createMockRes() as Response;

        const userWithoutField = {
          _id: mockUserId,
          name: 'Test User',
          email: 'test@example.com',
        };

        (UserModel.findById as jest.Mock).mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithoutField),
        });

        await getRecentlyViewed(req, res);

        expect(res.json).toHaveBeenCalledWith({
          games: [],
          total: 0,
          showing: '0 of 0',
        });
      });

      it('should filter out games that no longer exist', async () => {
        const deletedGameId = new mongoose.Types.ObjectId();
        const req = createMockReq({ id: mockUserId.toString() }) as Request;
        const res = createMockRes() as Response;

        const userWithGames = {
          ...mockUser,
          recentlyViewed: [
            { gameId: mockGameId, viewedAt: new Date('2024-01-02') },
            { gameId: deletedGameId, viewedAt: new Date('2024-01-01') },
          ],
        };

        (UserModel.findById as jest.Mock).mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithGames),
        });
        // Only return one game (the deleted one is missing)
        (GameModel.find as jest.Mock).mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockGame]),
        });

        await getRecentlyViewed(req, res);

        const response = (res.json as jest.Mock).mock.calls[0][0];
        expect(response.games).toHaveLength(1);
        expect(response.games[0].slug).toBe('test-game');
      });
    });

    describe('Validation and Errors', () => {
      it('should reject request without user authentication', async () => {
        const req = createMockReq(undefined) as Request;
        const res = createMockRes() as Response;

        await getRecentlyViewed(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorised' });
      });

      it('should return 404 if user not found', async () => {
        const req = createMockReq({ id: mockUserId.toString() }) as Request;
        const res = createMockRes() as Response;

        (UserModel.findById as jest.Mock).mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        });

        await getRecentlyViewed(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      });

      it('should handle database errors gracefully', async () => {
        const req = createMockReq({ id: mockUserId.toString() }) as Request;
        const res = createMockRes() as Response;

        (UserModel.findById as jest.Mock).mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('Database error')),
        });

        await getRecentlyViewed(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Failed to load recently viewed' });
      });
    });
  });

  describe('clearRecentlyViewed', () => {
    describe('Successful Clear', () => {
      it('should clear all recently viewed games', async () => {
        const req = createMockReq({ id: mockUserId.toString() }) as Request;
        const res = createMockRes() as Response;

        const userWithGames = {
          ...mockUser,
          recentlyViewed: [
            { gameId: mockGameId, viewedAt: new Date() },
            { gameId: mockGameId2, viewedAt: new Date() },
          ],
          save: jest.fn().mockResolvedValue(true),
        };

        (UserModel.findById as jest.Mock).mockResolvedValue(userWithGames);

        await clearRecentlyViewed(req, res);

        expect(userWithGames.recentlyViewed).toEqual([]);
        expect(userWithGames.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
          message: 'Recently viewed history cleared',
        });
      });

      it('should work even when list is already empty', async () => {
        const req = createMockReq({ id: mockUserId.toString() }) as Request;
        const res = createMockRes() as Response;

        const userWithNoGames = {
          ...mockUser,
          recentlyViewed: [],
          save: jest.fn().mockResolvedValue(true),
        };

        (UserModel.findById as jest.Mock).mockResolvedValue(userWithNoGames);

        await clearRecentlyViewed(req, res);

        expect(userWithNoGames.save).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
          message: 'Recently viewed history cleared',
        });
      });
    });

    describe('Validation and Errors', () => {
      it('should reject request without user authentication', async () => {
        const req = createMockReq(undefined) as Request;
        const res = createMockRes() as Response;

        await clearRecentlyViewed(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorised' });
        expect(UserModel.findById).not.toHaveBeenCalled();
      });

      it('should return 404 if user not found', async () => {
        const req = createMockReq({ id: mockUserId.toString() }) as Request;
        const res = createMockRes() as Response;

        (UserModel.findById as jest.Mock).mockResolvedValue(null);

        await clearRecentlyViewed(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      });

      it('should handle database errors gracefully', async () => {
        const req = createMockReq({ id: mockUserId.toString() }) as Request;
        const res = createMockRes() as Response;

        (UserModel.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

        await clearRecentlyViewed(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Failed to clear recently viewed history',
        });
      });
    });
  });
});
