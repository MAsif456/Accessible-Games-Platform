/**
 * Recently Viewed Routes - Complete Test Coverage
 * Tests route configuration and middleware integration
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import recentlyViewedRouter from '../../routes/recentlyViewed.routes';
import UserModel from '../../models/user';
import GameModel from '../../models/game';
import { protect } from '../../../middleware/auth';

// Mock dependencies
jest.mock('../../models/user');
jest.mock('../../models/game');
jest.mock('../../../middleware/auth');

const app = express();
app.use(express.json());
app.use('/api', recentlyViewedRouter);

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const mockUserId = new mongoose.Types.ObjectId();
const mockGameId = new mongoose.Types.ObjectId();

const mockUser = {
  _id: mockUserId,
  name: 'Test User',
  email: 'test@example.com',
  recentlyViewed: [],
  save: jest.fn().mockResolvedValue(true),
};

const mockGame = {
  _id: mockGameId,
  slug: 'test-game',
  title: 'Test Game',
  studio: 'Test Studio',
  description: 'Test description',
  thumbnailUrl: '/images/test.jpg',
  genres: ['Action'],
  accessibilityTags: ['Subtitles'],
  releaseYear: 2024,
  isPublished: true,
};

describe('Recently Viewed Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock protect middleware to inject user
    (protect as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: mockUserId.toString() };
      next();
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/recently-viewed/:gameId', () => {
    it('should add game to recently viewed', async () => {
      const userWithSave = { ...mockUser, save: jest.fn().mockResolvedValue(true) };
      (UserModel.findById as jest.Mock).mockResolvedValue(userWithSave);

      const response = await request(app)
        .post(`/api/recently-viewed/${mockGameId}`)
        .expect(200);

      expect(response.body).toHaveProperty('recentlyViewed');
      expect(userWithSave.save).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      // Mock protect to reject
      (protect as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ message: 'Unauthorised' });
      });

      const response = await request(app)
        .post(`/api/recently-viewed/${mockGameId}`)
        .expect(401);

      expect(response.body.message).toBe('Unauthorised');
    });

    it('should handle invalid game ID', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/recently-viewed/invalid-id')
        .expect(400);

      expect(response.body.message).toBe('Invalid game id');
    });

    it('should handle user not found', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/recently-viewed/${mockGameId}`)
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });

    it('should handle database errors', async () => {
      (UserModel.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post(`/api/recently-viewed/${mockGameId}`)
        .expect(500);

      expect(response.body.message).toBe('Failed to update recently viewed');
    });
  });

  describe('GET /api/recently-viewed', () => {
    it('should retrieve recently viewed games', async () => {
      const userWithGames = {
        ...mockUser,
        recentlyViewed: [{ gameId: mockGameId, viewedAt: new Date() }],
      };

      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(userWithGames),
      });
      (GameModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockGame]),
      });

      const response = await request(app).get('/api/recently-viewed').expect(200);

      expect(response.body).toHaveProperty('games');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('showing');
    });

    it('should require authentication', async () => {
      (protect as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ message: 'Unauthorised' });
      });

      const response = await request(app).get('/api/recently-viewed').expect(401);

      expect(response.body.message).toBe('Unauthorised');
    });

    it('should return empty array when no games viewed', async () => {
      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({ ...mockUser, recentlyViewed: [] }),
      });

      const response = await request(app).get('/api/recently-viewed').expect(200);

      expect(response.body.games).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should handle user not found', async () => {
      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const response = await request(app).get('/api/recently-viewed').expect(404);

      expect(response.body.message).toBe('User not found');
    });

    it('should handle database errors', async () => {
      (UserModel.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const response = await request(app).get('/api/recently-viewed').expect(500);

      expect(response.body.message).toBe('Failed to load recently viewed');
    });
  });

  describe('DELETE /api/recently-viewed', () => {
    it('should clear recently viewed history', async () => {
      const userWithGames = {
        ...mockUser,
        recentlyViewed: [{ gameId: mockGameId, viewedAt: new Date() }],
        save: jest.fn().mockResolvedValue(true),
      };
      (UserModel.findById as jest.Mock).mockResolvedValue(userWithGames);

      const response = await request(app).delete('/api/recently-viewed').expect(200);

      expect(response.body.message).toBe('Recently viewed history cleared');
      expect(userWithGames.recentlyViewed).toEqual([]);
      expect(userWithGames.save).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      (protect as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ message: 'Unauthorised' });
      });

      const response = await request(app).delete('/api/recently-viewed').expect(401);

      expect(response.body.message).toBe('Unauthorised');
    });

    it('should handle user not found', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app).delete('/api/recently-viewed').expect(404);

      expect(response.body.message).toBe('User not found');
    });

    it('should handle database errors', async () => {
      (UserModel.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/api/recently-viewed').expect(500);

      expect(response.body.message).toBe('Failed to clear recently viewed history');
    });
  });
});
