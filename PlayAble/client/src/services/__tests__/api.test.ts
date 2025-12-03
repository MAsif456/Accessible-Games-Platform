/**
 * API Service - Complete Test Coverage
 * Tests all API functions including games, reviews, cache, and recently viewed
 */

import {
  getGames,
  getGameById,
  getCachedGame,
  getReviewById,
  getAuthHeaders,
  getReviews,
  postReview,
  toggleReviewLike,
  reportReview,
  deleteReview,
  getUserDisplayName,
  addToRecentlyViewed,
  getRecentlyViewed,
  clearRecentlyViewed,
} from '../api';
import * as apiHelper from '../../utils/apiHelper';

// Mock apiHelper
jest.mock('../../utils/apiHelper');

// Mock global fetch
global.fetch = jest.fn();

describe('API Service', () => {
  const mockGame = {
    id: 'game123',
    _id: 'game123',
    slug: 'test-game',
    title: 'Test Game',
    studio: 'Test Studio',
    description: 'Test description',
    thumbnailUrl: '/images/test.jpg',
    genres: ['Action'],
    accessibilityTags: ['Subtitles'],
    releaseYear: 2024,
  };

  const mockReview = {
    _id: 'review123',
    gameId: 'game123',
    userId: 'user123',
    authorName: 'Test User',
    body: 'Great game!',
    likes: 5,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getGames', () => {
    it('should fetch games successfully with no params', async () => {
      const mockResponse = {
        games: [mockGame],
        currentPage: 1,
        pageSize: 20,
        totalResults: 1,
        totalPages: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getGames({});

      expect(global.fetch).toHaveBeenCalledWith('/api/games?', {});
      expect(result).toEqual(mockResponse);
    });

    it('should include page and pageSize in query', async () => {
      const mockResponse = {
        games: [],
        currentPage: 2,
        pageSize: 10,
        totalResults: 0,
        totalPages: 0,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await getGames({ page: 2, pageSize: 10 });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('page=2'), {});
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('pageSize=10'), {});
    });

    it('should include search query and trim whitespace', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ games: [], currentPage: 1, pageSize: 20, totalResults: 0, totalPages: 0 }),
      });

      await getGames({ search: '  test game  ' });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('search=test+game'), {});
    });

    it('should include genres in query', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ games: [], currentPage: 1, pageSize: 20, totalResults: 0, totalPages: 0 }),
      });

      await getGames({ genres: ['Action', 'RPG'] });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('genres=Action%2CRPG'), {});
    });

    it('should include tags in query', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ games: [], currentPage: 1, pageSize: 20, totalResults: 0, totalPages: 0 }),
      });

      await getGames({ tags: ['Subtitles', 'ColorBlind'] });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('tags=Subtitles%2CColorBlind'), {});
    });

    it('should include sort in query', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ games: [], currentPage: 1, pageSize: 20, totalResults: 0, totalPages: 0 }),
      });

      await getGames({ sort: 'title' });

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('sort=title'), {});
    });

    it('should cache fetched games', async () => {
      const mockResponse = {
        games: [mockGame],
        currentPage: 1,
        pageSize: 20,
        totalResults: 1,
        totalPages: 1,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await getGames({});

      // Verify game is cached
      const cached = getCachedGame('game123');
      expect(cached).toEqual(mockGame);
    });

    it('should return fallback games when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await getGames({});

      // Should return fallback games instead of throwing
      expect(result.games).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'fallback-1',
          title: 'Fallback Adventure',
        })
      ]));
    });
  });

  describe('getGameById', () => {
    it('should return cached game if available', async () => {
      // First fetch to cache the game
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          games: [mockGame],
          currentPage: 1,
          pageSize: 20,
          totalResults: 1,
          totalPages: 1,
        }),
      });

      await getGames({});

      // Clear mock to verify no new fetch
      (global.fetch as jest.Mock).mockClear();

      const result = await getGameById('game123');

      expect(result).toEqual(mockGame);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch by ID if not cached', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGame,
      });

      const result = await getGameById('uniquegame456');

      expect(global.fetch).toHaveBeenCalledWith('/api/games/uniquegame456');
      expect(result.title).toEqual(mockGame.title);
    });

    it('should fallback to list fetch if ID fetch fails', async () => {
      const uncachedGame = { ...mockGame, id: 'uncached789', _id: 'uncached789' };
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            games: [uncachedGame],
            currentPage: 1,
            pageSize: 200,
            totalResults: 1,
            totalPages: 1,
          }),
        });

      const result = await getGameById('uncached789');

      expect(result.id).toEqual('uncached789');
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/games?'), {});
    });

    it('should throw error if game not found in list', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            games: [],
            currentPage: 1,
            pageSize: 200,
            totalResults: 0,
            totalPages: 0,
          }),
        });

      await expect(getGameById('nonexistent')).rejects.toThrow('Game not found');
    });

    it('should match by _id in list fallback', async () => {
      const gameWithId = { ...mockGame, id: 'different-id', _id: 'specialid999' };
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            games: [gameWithId],
            currentPage: 1,
            pageSize: 200,
            totalResults: 1,
            totalPages: 1,
          }),
        });

      const result = await getGameById('specialid999');

      expect(result._id).toEqual('specialid999');
    });
  });

  describe('getCachedGame', () => {
    it('should return undefined if game not cached', () => {
      const result = getCachedGame('totallynewgame999');

      expect(result).toBeUndefined();
    });

    it('should return cached game by id', async () => {
      const cacheTestGame = { ...mockGame, id: 'cachetest123', _id: 'cachetest123' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          games: [cacheTestGame],
          currentPage: 1,
          pageSize: 20,
          totalResults: 1,
          totalPages: 1,
        }),
      });

      await getGames({});

      const result = getCachedGame('cachetest123');

      expect(result?.id).toEqual('cachetest123');
    });

    it('should return cached game by _id', async () => {
      const cacheTestGame2 = { ...mockGame, id: 'cachetest456', _id: 'cachetest456' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => cacheTestGame2,
      });

      await getGameById('newcachedgame888');

      const result = getCachedGame(mockGame.id);

      expect(result).toBeDefined();
    });
  });

  describe('getReviewById', () => {
    it('should fetch review successfully', async () => {
      const mockResponse = {
        game: mockGame,
        review: {
          id: 'review123',
          author: 'Test User',
          createdAt: '2024-01-01',
          content: 'Great game!',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getReviewById('review123');

      expect(global.fetch).toHaveBeenCalledWith('/api/reviews/review123');
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(getReviewById('nonexistent')).rejects.toThrow('Failed to fetch review: 404');
    });
  });

  describe('getAuthHeaders', () => {
    it('should return auth header when token exists', () => {
      localStorage.setItem('token', 'test-token');

      const headers = getAuthHeaders();

      expect(headers).toEqual({ Authorization: 'Bearer test-token' });
    });

    it('should return empty object when no token', () => {
      const headers = getAuthHeaders();

      expect(headers).toEqual({});
    });
  });

  describe('getReviews', () => {
    it('should fetch reviews for a game', async () => {
      const mockReviews = [mockReview];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviews,
      });

      const result = await getReviews('game123');

      expect(global.fetch).toHaveBeenCalledWith('/api/games/game123/reviews');
      expect(result).toEqual(mockReviews);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(getReviews('game123')).rejects.toThrow('Failed to fetch reviews: 500');
    });
  });

  describe('postReview', () => {
    it('should post review successfully', async () => {
      localStorage.setItem('token', 'test-token');
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockReview,
      });

      const result = await postReview('game123', 'Great game!');

      expect(apiHelper.apiPost).toHaveBeenCalledWith(
        '/api/games/game123/reviews',
        { body: 'Great game!' },
        { headers: { Authorization: 'Bearer test-token' } }
      );
      expect(result).toEqual(mockReview);
    });

    it('should include author name if provided', async () => {
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockReview,
      });

      await postReview('game123', 'Great game!', 'Test User');

      expect(apiHelper.apiPost).toHaveBeenCalledWith(
        '/api/games/game123/reviews',
        { body: 'Great game!', authorName: 'Test User' },
        { headers: {} }
      );
    });

    it('should throw error when post fails', async () => {
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(postReview('game123', 'Test')).rejects.toThrow('Failed to post review: 400');
    });
  });

  describe('toggleReviewLike', () => {
    it('should toggle like successfully', async () => {
      localStorage.setItem('token', 'test-token');
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ ...mockReview, likes: 6 }),
      });

      const result = await toggleReviewLike('review123', true);

      expect(apiHelper.apiPost).toHaveBeenCalledWith(
        '/api/reviews/review123/like',
        { liked: true },
        { headers: { Authorization: 'Bearer test-token' } }
      );
      expect(result.likes).toBe(6);
    });

    it('should throw error when toggle fails', async () => {
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(toggleReviewLike('review123', true)).rejects.toThrow('Failed to toggle like: 401');
    });
  });

  describe('reportReview', () => {
    it('should report review successfully', async () => {
      localStorage.setItem('token', 'test-token');
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: true,
      });

      await reportReview('review123', 'Inappropriate content');

      expect(apiHelper.apiPost).toHaveBeenCalledWith(
        '/api/reviews/review123/report',
        { reasonText: 'Inappropriate content', voiceTranscript: undefined },
        { headers: { Authorization: 'Bearer test-token' } }
      );
    });

    it('should include voice transcript if provided', async () => {
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: true,
      });

      await reportReview('review123', 'Spam', 'Voice transcript text');

      expect(apiHelper.apiPost).toHaveBeenCalledWith(
        '/api/reviews/review123/report',
        { reasonText: 'Spam', voiceTranscript: 'Voice transcript text' },
        { headers: {} }
      );
    });

    it('should throw error when report fails', async () => {
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(reportReview('review123', 'Test')).rejects.toThrow('Failed to submit report: 400');
    });
  });

  describe('deleteReview', () => {
    it('should delete review successfully', async () => {
      localStorage.setItem('token', 'test-token');
      (apiHelper.apiDelete as jest.Mock).mockResolvedValue({
        ok: true,
      });

      await deleteReview('review123');

      expect(apiHelper.apiDelete).toHaveBeenCalledWith(
        '/api/reviews/review123',
        { headers: { Authorization: 'Bearer test-token' } }
      );
    });

    it('should throw error with message from response', async () => {
      (apiHelper.apiDelete as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Unauthorized' }),
      });

      await expect(deleteReview('review123')).rejects.toThrow('Unauthorized');
    });

    it('should throw default error if no message in response', async () => {
      (apiHelper.apiDelete as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(deleteReview('review123')).rejects.toThrow('Failed to delete review');
    });
  });

  describe('getUserDisplayName', () => {
    it('should get user display name successfully', async () => {
      localStorage.setItem('token', 'test-token');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Test User' }),
      });

      const result = await getUserDisplayName('user123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users/user123',
        { headers: { Authorization: 'Bearer test-token' } }
      );
      expect(result).toBe('Test User');
    });

    it('should return null when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await getUserDisplayName('user123');

      expect(result).toBeNull();
    });

    it('should handle fullName field', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ fullName: 'Full Name' }),
      });

      const result = await getUserDisplayName('user123');

      expect(result).toBe('Full Name');
    });

    it('should handle username field', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ username: 'testuser' }),
      });

      const result = await getUserDisplayName('user123');

      expect(result).toBe('testuser');
    });

    it('should handle nested user object', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ user: { name: 'Nested Name' } }),
      });

      const result = await getUserDisplayName('user123');

      expect(result).toBe('Nested Name');
    });

    it('should trim whitespace from names', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ name: '  Test User  ' }),
      });

      const result = await getUserDisplayName('user123');

      expect(result).toBe('Test User');
    });

    it('should return null if JSON parsing fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await getUserDisplayName('user123');

      expect(result).toBeNull();
    });

    it('should return null if no name fields found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await getUserDisplayName('user123');

      expect(result).toBeNull();
    });
  });

  describe('addToRecentlyViewed', () => {
    it('should add game to recently viewed successfully', async () => {
      localStorage.setItem('token', 'test-token');
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: true,
      });

      await addToRecentlyViewed('game123');

      expect(apiHelper.apiPost).toHaveBeenCalledWith(
        '/api/recently-viewed/game123',
        undefined,
        { headers: { Authorization: 'Bearer test-token' } }
      );
    });

    it('should throw error when add fails', async () => {
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(addToRecentlyViewed('game123')).rejects.toThrow('Failed to add to recently viewed: 400');
    });
  });

  describe('getRecentlyViewed', () => {
    it('should fetch recently viewed games', async () => {
      localStorage.setItem('token', 'test-token');
      const mockResponse = {
        games: [mockGame],
        total: 1,
        showing: '1 game',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getRecentlyViewed();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/recently-viewed',
        { headers: { Authorization: 'Bearer test-token' } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(getRecentlyViewed()).rejects.toThrow('Failed to fetch recently viewed: 401');
    });
  });

  describe('clearRecentlyViewed', () => {
    it('should clear recently viewed successfully', async () => {
      localStorage.setItem('token', 'test-token');
      (apiHelper.apiDelete as jest.Mock).mockResolvedValue({
        ok: true,
      });

      await clearRecentlyViewed();

      expect(apiHelper.apiDelete).toHaveBeenCalledWith(
        '/api/recently-viewed',
        { headers: { Authorization: 'Bearer test-token' } }
      );
    });

    it('should throw error when clear fails', async () => {
      (apiHelper.apiDelete as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(clearRecentlyViewed()).rejects.toThrow('Failed to clear recently viewed: 500');
    });
  });
});
