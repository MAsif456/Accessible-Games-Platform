/**
 * Games Repository - Complete Test Coverage
 * Tests all CRUD operations, error handling, singleton pattern, and query methods
 */

import mongoose from 'mongoose';
import { GamesRepository } from '../../repositories/games.repository';
import * as models from '../../models';

// Mock the entire models module
jest.mock('../../models');

const { GameModel } = models as jest.Mocked<typeof models>;

describe('GamesRepository', () => {
  let repository: GamesRepository;
  const mockGameId = new mongoose.Types.ObjectId();

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

  beforeEach(() => {
    jest.clearAllMocks();
    repository = GamesRepository.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = GamesRepository.getInstance();
      const instance2 = GamesRepository.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should have a single instance throughout the application', () => {
      const instances = Array.from({ length: 5 }, () => GamesRepository.getInstance());
      const firstInstance = instances[0];

      instances.forEach(instance => {
        expect(instance).toBe(firstInstance);
      });
    });
  });

  describe('findById', () => {
    it('should find a game by ID successfully', async () => {
      const execMock = jest.fn().mockResolvedValue(mockGame);
      (GameModel.findById as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.findById(mockGameId.toString());

      expect(GameModel.findById).toHaveBeenCalledWith(mockGameId.toString());
      expect(result).toEqual(mockGame);
    });

    it('should return null when game is not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      (GameModel.findById as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const execMock = jest.fn().mockRejectedValue(new Error('Database error'));
      (GameModel.findById as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.findById(mockGameId.toString());

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('findAll', () => {
    const mockGames = [mockGame, { ...mockGame, _id: new mongoose.Types.ObjectId() }];

    it('should find all games with no filters', async () => {
      const queryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockGames),
      };
      (GameModel.find as jest.Mock).mockReturnValue(queryMock);

      const result = await repository.findAll({});

      expect(GameModel.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockGames);
    });

    it('should apply filters correctly', async () => {
      const filter = { isPublished: true };
      const queryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockGames),
      };
      (GameModel.find as jest.Mock).mockReturnValue(queryMock);

      const result = await repository.findAll(filter);

      expect(GameModel.find).toHaveBeenCalledWith(filter);
      expect(result).toEqual(mockGames);
    });

    it('should apply sort options', async () => {
      const sortOptions = { releaseYear: -1 as const };
      const queryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockGames),
      };
      (GameModel.find as jest.Mock).mockReturnValue(queryMock);

      await repository.findAll({}, sortOptions);

      expect(queryMock.sort).toHaveBeenCalledWith(sortOptions);
    });

    it('should apply skip option', async () => {
      const queryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockGames),
      };
      (GameModel.find as jest.Mock).mockReturnValue(queryMock);

      await repository.findAll({}, undefined, 10);

      expect(queryMock.skip).toHaveBeenCalledWith(10);
    });

    it('should apply limit option', async () => {
      const queryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockGames),
      };
      (GameModel.find as jest.Mock).mockReturnValue(queryMock);

      await repository.findAll({}, undefined, undefined, 20);

      expect(queryMock.limit).toHaveBeenCalledWith(20);
    });

    it('should apply all options together', async () => {
      const filter = { isPublished: true };
      const sort = { releaseYear: -1 as const };
      const queryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockGames),
      };
      (GameModel.find as jest.Mock).mockReturnValue(queryMock);

      await repository.findAll(filter, sort, 10, 20);

      expect(GameModel.find).toHaveBeenCalledWith(filter);
      expect(queryMock.sort).toHaveBeenCalledWith(sort);
      expect(queryMock.skip).toHaveBeenCalledWith(10);
      expect(queryMock.limit).toHaveBeenCalledWith(20);
    });

    it('should handle errors and return empty array', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const queryMock = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      (GameModel.find as jest.Mock).mockReturnValue(queryMock);

      const result = await repository.findAll({});

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('findOne', () => {
    it('should find a single game by filter', async () => {
      const filter = { slug: 'test-game' };
      const execMock = jest.fn().mockResolvedValue(mockGame);
      (GameModel.findOne as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.findOne(filter);

      expect(GameModel.findOne).toHaveBeenCalledWith(filter);
      expect(result).toEqual(mockGame);
    });

    it('should return null when no game matches filter', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      (GameModel.findOne as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.findOne({ slug: 'nonexistent' });

      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const execMock = jest.fn().mockRejectedValue(new Error('Database error'));
      (GameModel.findOne as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.findOne({ slug: 'test' });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('countDocuments', () => {
    it('should count all documents with no filter', async () => {
      const execMock = jest.fn().mockResolvedValue(10);
      (GameModel.countDocuments as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.countDocuments({});

      expect(GameModel.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(10);
    });

    it('should count documents matching filter', async () => {
      const filter = { isPublished: true };
      const execMock = jest.fn().mockResolvedValue(5);
      (GameModel.countDocuments as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.countDocuments(filter);

      expect(GameModel.countDocuments).toHaveBeenCalledWith(filter);
      expect(result).toBe(5);
    });

    it('should handle errors and return 0', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const execMock = jest.fn().mockRejectedValue(new Error('Database error'));
      (GameModel.countDocuments as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.countDocuments({});

      expect(result).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('create', () => {
    it('should create a new game successfully', async () => {
      const newGameData = {
        slug: 'new-game',
        title: 'New Game',
        studio: 'New Studio',
        description: 'New description',
      };

      const mockSave = jest.fn().mockResolvedValue(mockGame);
      const mockInstance = {
        save: mockSave,
        ...mockGame,
      };

      (GameModel as any).mockImplementation(() => mockInstance);

      const result = await repository.create(newGameData);

      expect(mockSave).toHaveBeenCalled();
      expect(result).toMatchObject({
        slug: mockGame.slug,
        title: mockGame.title,
        studio: mockGame.studio,
      });
    });

    it('should throw error when creation fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Validation error');
      const mockSave = jest.fn().mockRejectedValue(error);

      (GameModel as any).mockImplementation(() => ({ save: mockSave }));

      await expect(repository.create({})).rejects.toThrow('Validation error');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('update', () => {
    it('should update a game successfully', async () => {
      const updateData = { title: 'Updated Title' };
      const execMock = jest.fn().mockResolvedValue({ ...mockGame, ...updateData });
      (GameModel.findByIdAndUpdate as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.update(mockGameId.toString(), updateData);

      expect(GameModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockGameId.toString(),
        updateData,
        { new: true, runValidators: true }
      );
      expect(result).toMatchObject(updateData);
    });

    it('should return null when game to update is not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      (GameModel.findByIdAndUpdate as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.update('nonexistent-id', { title: 'New' });

      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const execMock = jest.fn().mockRejectedValue(new Error('Update error'));
      (GameModel.findByIdAndUpdate as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.update(mockGameId.toString(), { title: 'New' });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('delete', () => {
    it('should delete a game successfully', async () => {
      const execMock = jest.fn().mockResolvedValue(mockGame);
      (GameModel.findByIdAndDelete as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.delete(mockGameId.toString());

      expect(GameModel.findByIdAndDelete).toHaveBeenCalledWith(mockGameId.toString());
      expect(result).toBe(true);
    });

    it('should return false when game to delete is not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      (GameModel.findByIdAndDelete as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.delete('nonexistent-id');

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const execMock = jest.fn().mockRejectedValue(new Error('Delete error'));
      (GameModel.findByIdAndDelete as jest.Mock).mockReturnValue({ exec: execMock });

      const result = await repository.delete(mockGameId.toString());

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('exists', () => {
    it('should return true when game exists', async () => {
      const filter = { slug: 'test-game' };
      const limitMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(1);
      (GameModel.countDocuments as jest.Mock).mockReturnValue({
        limit: limitMock,
        exec: execMock,
      });

      const result = await repository.exists(filter);

      expect(GameModel.countDocuments).toHaveBeenCalledWith(filter);
      expect(limitMock).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should return false when game does not exist', async () => {
      const limitMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(0);
      (GameModel.countDocuments as jest.Mock).mockReturnValue({
        limit: limitMock,
        exec: execMock,
      });

      const result = await repository.exists({ slug: 'nonexistent' });

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const limitMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockRejectedValue(new Error('Database error'));
      (GameModel.countDocuments as jest.Mock).mockReturnValue({
        limit: limitMock,
        exec: execMock,
      });

      const result = await repository.exists({ slug: 'test' });

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
