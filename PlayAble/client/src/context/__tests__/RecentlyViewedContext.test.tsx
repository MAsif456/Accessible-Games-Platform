/**
 * RecentlyViewedContext - Complete Test Coverage
 * Tests provider, hook, fetch, clear, and error handling
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import { RecentlyViewedProvider, useRecentlyViewed } from '../RecentlyViewedContext';
import { AuthProvider } from '../AuthContext';
import authService from '../../services/authService';
import * as apiHelper from '../../utils/apiHelper';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../utils/apiHelper');

// Mock Auth Context with custom hook
const mockUseAuth = {
  user: null as any,
  isAuthenticated: false,
  loading: false,
  login: jest.fn(),
  signup: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
  changeEmail: jest.fn(),
  changePassword: jest.fn(),
};

jest.mock('../AuthContext', () => ({
  ...jest.requireActual('../AuthContext'),
  useAuth: () => mockUseAuth,
  AuthProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock global fetch
global.fetch = jest.fn();

describe('RecentlyViewedContext', () => {
  const mockUser = {
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    favourites: [],
    recentlyViewed: [],
    accessibilitySettings: {},
  };

  const mockGames = [
    {
      id: 'game1',
      title: 'Test Game 1',
      studio: 'Test Studio',
      description: 'Test description',
      thumbnailUrl: '/images/game1.jpg',
      genres: ['Action'],
      accessibilityTags: ['Subtitles'],
    },
    {
      id: 'game2',
      title: 'Test Game 2',
      studio: 'Test Studio 2',
      description: 'Test description 2',
      thumbnailUrl: '/images/game2.jpg',
      genres: ['RPG'],
      accessibilityTags: ['Color Blind'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getToken as jest.Mock).mockReturnValue('mock-token');
    (global.fetch as jest.Mock).mockClear();

    // Reset mock auth to authenticated state by default
    mockUseAuth.user = mockUser;
    mockUseAuth.isAuthenticated = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Provider and Hook', () => {
    it('should throw error when useRecentlyViewed is used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        useRecentlyViewed();
        return <div>Test</div>;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'useRecentlyViewed must be used within a RecentlyViewedProvider'
      );

      consoleError.mockRestore();
    });

    it('should provide context value to children', () => {
      const TestComponent = () => {
        const context = useRecentlyViewed();
        return (
          <div>
            <div data-testid="games">{context.games.length}</div>
            <div data-testid="total">{context.total}</div>
            <div data-testid="loading">{context.isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      expect(screen.getByTestId('games')).toHaveTextContent('0');
      expect(screen.getByTestId('total')).toHaveTextContent('0');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    it('should initialize with empty state', () => {
      const TestComponent = () => {
        const { games, total, isLoading } = useRecentlyViewed();
        return (
          <div>
            <div data-testid="initial-games">{games.length}</div>
            <div data-testid="initial-total">{total}</div>
            <div data-testid="initial-loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      expect(screen.getByTestId('initial-games')).toHaveTextContent('0');
      expect(screen.getByTestId('initial-total')).toHaveTextContent('0');
      expect(screen.getByTestId('initial-loading')).toHaveTextContent('false');
    });
  });

  describe('fetchRecentlyViewed', () => {
    it('should fetch recently viewed games successfully', async () => {
      const mockResponse = {
        games: mockGames,
        total: mockGames.length,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const TestComponent = () => {
        const { games, total, fetchRecentlyViewed } = useRecentlyViewed();
        return (
          <div>
            <button onClick={fetchRecentlyViewed} data-testid="fetch-btn">
              Fetch
            </button>
            <div data-testid="games-count">{games.length}</div>
            <div data-testid="total-count">{total}</div>
          </div>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      const fetchBtn = screen.getByTestId('fetch-btn');

      await act(async () => {
        fetchBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('games-count')).toHaveTextContent('2');
        expect(screen.getByTestId('total-count')).toHaveTextContent('2');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/recently-viewed', {
        headers: { Authorization: 'Bearer mock-token' },
      });
    });

    it('should not fetch when user is not authenticated', async () => {
      // Set mock auth to unauthenticated state
      mockUseAuth.isAuthenticated = false;
      mockUseAuth.user = null;

      const TestComponent = () => {
        const { fetchRecentlyViewed } = useRecentlyViewed();
        return (
          <button onClick={fetchRecentlyViewed} data-testid="fetch-btn">
            Fetch
          </button>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      const fetchBtn = screen.getByTestId('fetch-btn');

      await act(async () => {
        fetchBtn.click();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const TestComponent = () => {
        const { games, fetchRecentlyViewed } = useRecentlyViewed();
        return (
          <div>
            <button onClick={fetchRecentlyViewed} data-testid="fetch-btn">
              Fetch
            </button>
            <div data-testid="games-count">{games.length}</div>
          </div>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      const fetchBtn = screen.getByTestId('fetch-btn');

      await act(async () => {
        fetchBtn.click();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(screen.getByTestId('games-count')).toHaveTextContent('0');
      });

      consoleErrorSpy.mockRestore();
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: any;
      const fetchPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

      const TestComponent = () => {
        const { isLoading, fetchRecentlyViewed } = useRecentlyViewed();
        return (
          <div>
            <button onClick={fetchRecentlyViewed} data-testid="fetch-btn">
              Fetch
            </button>
            <div data-testid="loading-state">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      const fetchBtn = screen.getByTestId('fetch-btn');

      act(() => {
        fetchBtn.click();
      });

      // Check loading is true during fetch
      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
      });

      // Resolve the promise
      act(() => {
        resolvePromise({
          ok: true,
          json: async () => ({ games: mockGames, total: mockGames.length }),
        });
      });

      // Check loading is false after fetch
      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
      });
    });

    it('should handle network errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const TestComponent = () => {
        const { fetchRecentlyViewed } = useRecentlyViewed();
        return (
          <button onClick={fetchRecentlyViewed} data-testid="fetch-btn">
            Fetch
          </button>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      const fetchBtn = screen.getByTestId('fetch-btn');

      await act(async () => {
        fetchBtn.click();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should use authorization header when token is available', async () => {
      (authService.getToken as jest.Mock).mockReturnValue('test-token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: [], total: 0 }),
      });

      const TestComponent = () => {
        const { fetchRecentlyViewed } = useRecentlyViewed();
        return (
          <button onClick={fetchRecentlyViewed} data-testid="fetch-btn">
            Fetch
          </button>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      const fetchBtn = screen.getByTestId('fetch-btn');

      await act(async () => {
        fetchBtn.click();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/recently-viewed', {
          headers: { Authorization: 'Bearer test-token' },
        });
      });
    });
  });

  describe('clearRecentlyViewed', () => {
    it('should clear recently viewed history successfully', async () => {
      // First fetch some games
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: mockGames, total: mockGames.length }),
      });

      (apiHelper.apiDelete as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Cleared' }),
      });

      const TestComponent = () => {
        const { games, total, fetchRecentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
        return (
          <div>
            <button onClick={fetchRecentlyViewed} data-testid="fetch-btn">
              Fetch
            </button>
            <button onClick={clearRecentlyViewed} data-testid="clear-btn">
              Clear
            </button>
            <div data-testid="games-count">{games.length}</div>
            <div data-testid="total-count">{total}</div>
          </div>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      const fetchBtn = screen.getByTestId('fetch-btn');
      const clearBtn = screen.getByTestId('clear-btn');

      // Fetch games
      await act(async () => {
        fetchBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('games-count')).toHaveTextContent('2');
      });

      // Clear games
      await act(async () => {
        clearBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('games-count')).toHaveTextContent('0');
        expect(screen.getByTestId('total-count')).toHaveTextContent('0');
      });

      expect(apiHelper.apiDelete).toHaveBeenCalledWith('/api/recently-viewed', {
        headers: { Authorization: 'Bearer mock-token' },
      });
    });

    it('should not clear when user is not authenticated', async () => {
      // Set mock auth to unauthenticated state
      mockUseAuth.isAuthenticated = false;
      mockUseAuth.user = null;

      const TestComponent = () => {
        const { clearRecentlyViewed } = useRecentlyViewed();
        return (
          <button onClick={clearRecentlyViewed} data-testid="clear-btn">
            Clear
          </button>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      const clearBtn = screen.getByTestId('clear-btn');

      await act(async () => {
        clearBtn.click();
      });

      expect(apiHelper.apiDelete).not.toHaveBeenCalled();
    });

    it('should handle clear errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (apiHelper.apiDelete as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const TestComponent = () => {
        const { clearRecentlyViewed } = useRecentlyViewed();
        return (
          <button onClick={clearRecentlyViewed} data-testid="clear-btn">
            Clear
          </button>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      const clearBtn = screen.getByTestId('clear-btn');

      await act(async () => {
        clearBtn.click();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to clear recently viewed history');
      });

      consoleErrorSpy.mockRestore();
    });

    it('should use authorization header when clearing', async () => {
      (authService.getToken as jest.Mock).mockReturnValue('test-token-2');
      (apiHelper.apiDelete as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Cleared' }),
      });

      const TestComponent = () => {
        const { clearRecentlyViewed } = useRecentlyViewed();
        return (
          <button onClick={clearRecentlyViewed} data-testid="clear-btn">
            Clear
          </button>
        );
      };

      render(
        <RecentlyViewedProvider>
          <TestComponent />
        </RecentlyViewedProvider>
      );

      const clearBtn = screen.getByTestId('clear-btn');

      await act(async () => {
        clearBtn.click();
      });

      await waitFor(() => {
        expect(apiHelper.apiDelete).toHaveBeenCalledWith('/api/recently-viewed', {
          headers: { Authorization: 'Bearer test-token-2' },
        });
      });
    });
  });
});
