import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../src/App';
import * as api from '../../src/services/api';
import settingsApi from '../../src/services/settingsApi';
import { AuthProvider } from '../../src/context/AuthContext';
import { FavouritesProvider } from '../../src/context/FavouritesContext';

jest.mock('../../src/context/AuthContext', () => {
  const actual = jest.requireActual('../../src/context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 'test-user', name: 'Test User', role: 'user' },
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
    }),
  };
});

// Mock the settings API module
jest.mock('../../src/services/settingsApi', () => ({
  __esModule: true,
  default: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    resetSettings: jest.fn(),
  },
  settingsApi: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    resetSettings: jest.fn(),
  },
}));

// Mock data
const mockGames: api.GameDto[] = [
  {
    id: '1',
    _id: '1',
    slug: 'game-one',
    title: 'Game One',
    studio: 'Studio One',
    description: 'First test game',
    thumbnailUrl: '/game-one.png',
    genres: ['Action'],
    accessibilityTags: ['Vision'],
    releaseYear: 2020,
  },
  {
    id: '2',
    _id: '2',
    slug: 'game-two',
    title: 'Game Two',
    studio: 'Studio Two',
    description: 'Second test game',
    thumbnailUrl: '/game-two.png',
    genres: ['Puzzle'],
    accessibilityTags: ['Motor'],
    releaseYear: 2021,
  },
];

// Track recently viewed games for mock state
let recentlyViewedGames: api.GameDto[] = [];

// Mock the RecentlyViewedContext
jest.mock('../../src/context/RecentlyViewedContext', () => {
  const actual = jest.requireActual('../../src/context/RecentlyViewedContext');
  return {
    ...actual,
    useRecentlyViewed: () => ({
      games: recentlyViewedGames,
      total: recentlyViewedGames.length,
      isLoading: false,
      fetchRecentlyViewed: jest.fn(),
      clearRecentlyViewed: jest.fn().mockImplementation(async () => {
        recentlyViewedGames = [];
      }),
    }),
  };
});

jest.mock('../../src/services/api');

const mockedApi = api as jest.Mocked<typeof api>;

function mockAuthenticatedUser() {
  (window as any).localStorage.setItem('token', 'fake-token');
}

// Helper to render the app with providers
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <FavouritesProvider>{ui}</FavouritesProvider>
    </AuthProvider>
  );
}

describe('Recently Viewed integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedUser();

    // Reset recently viewed state
    recentlyViewedGames = [];

    // Mock settings API
    (settingsApi.getSettings as jest.Mock).mockResolvedValue({
      voiceInput: false,
      captions: false,
      microphoneActive: false,
      highContrastMode: false,
      highContrastTheme: 'tidepool',
      reducedMotion: false,
      darkMode: false,
    });

    // Default getGames response
    mockedApi.getGames.mockResolvedValue({
      games: mockGames,
      currentPage: 1,
      pageSize: 9,
      totalResults: mockGames.length,
      totalPages: 1,
    } as any);

    // Mock getGameById to return the correct game
    mockedApi.getGameById.mockImplementation(async (id: string) => {
      const found = mockGames.find(g => g.id === id);
      return found as api.GameDto;
    });

    // Mock getCachedGame
    mockedApi.getCachedGame.mockReturnValue(undefined);

    // Mock addToRecentlyViewed to update our local state
    mockedApi.addToRecentlyViewed.mockImplementation(async (gameId: string) => {
      const found = mockGames.find(g => g.id === gameId);
      if (found) {
        const existingIndex = recentlyViewedGames.findIndex(g => g.id === gameId);
        if (existingIndex !== -1) {
          recentlyViewedGames.splice(existingIndex, 1);
        }
        recentlyViewedGames.unshift(found);
      }
    });

    mockedApi.getRecentlyViewed.mockResolvedValue({
      games: [],
      total: 0,
      showing: '0 of 0',
    });

    mockedApi.clearRecentlyViewed.mockImplementation(async () => {
      recentlyViewedGames = [];
    });

    // Ensure GameDetailsPage's review fetching effect works during tests
    mockedApi.getReviews.mockResolvedValue([]);
  });

  it('adds a game to recently viewed when viewing details from Browse and shows it at top of Recently Viewed', async () => {
    renderWithProviders(<App />);

    // Wait for browse page games
    await screen.findByText('Game One');

    // Click first card to open details
    fireEvent.click(screen.getByText('Game One'));

    // Wait for details page to load
    await screen.findByRole('main', { name: /Game details for Game One/i });

    // Verify addToRecentlyViewed was called
    await waitFor(() => {
      expect(mockedApi.addToRecentlyViewed).toHaveBeenCalledWith('1');
    });

    // Navigate to Recently Viewed via nav
    const recentlyViewedNav = screen.getByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(recentlyViewedNav);

    // Use level: 1 to target only the h1 heading
    await screen.findByRole('heading', { level: 1, name: /Recently Viewed/i });

    // Check that the game is shown
    expect(screen.getByText('Game One')).toBeInTheDocument();
  });

  it('shows viewed games with image, title, developer, description, genres and accessibility tags plus count text', async () => {
    // Pre-populate recently viewed games
    recentlyViewedGames = [...mockGames];

    renderWithProviders(<App />);

    // Navigate directly to Recently Viewed nav
    const recentlyViewedNav = await screen.findByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(recentlyViewedNav);

    // Use level: 1 to target only the h1 heading
    await screen.findByRole('heading', { level: 1, name: /Recently Viewed/i });

    // For each game card assert key bits of UI
    for (const game of mockGames) {
      expect(screen.getByText(game.title)).toBeInTheDocument();
      expect(screen.getByText(game.studio)).toBeInTheDocument();
      expect(screen.getByText(game.description)).toBeInTheDocument();

      // Genres and accessibility tags are rendered as pill text
      game.genres.forEach(genre => {
        expect(screen.getByText(genre)).toBeInTheDocument();
      });
      game.accessibilityTags.forEach(tag => {
        expect(screen.getByText(tag)).toBeInTheDocument();
      });

      // Image alt should be the game title
      expect(screen.getByAltText(game.title)).toBeInTheDocument();
    }
  });

  it('orders recently viewed games in reverse chronological order and moves re-viewed game to top without duplicates', async () => {
    renderWithProviders(<App />);

    // Wait for browse page to show both games
    await screen.findByText('Game One');

    // View Game One then Game Two
    fireEvent.click(screen.getByText('Game One'));
    await screen.findByRole('main', { name: /Game details for Game One/i });

    // Back to Browse via breadcrumb/back button
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));

    await screen.findByText('Game Two');
    fireEvent.click(screen.getByText('Game Two'));
    await screen.findByRole('main', { name: /Game details for Game Two/i });

    // Navigate to Recently Viewed
    const recentlyViewedNav = screen.getByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(recentlyViewedNav);

    // Use level: 1 to target only the h1 heading
    await screen.findByRole('heading', { level: 1, name: /Recently Viewed/i });

    // Find all game titles and check order
    const gameTitles = screen.getAllByText(/Game (One|Two)/);
    expect(gameTitles[0]).toHaveTextContent('Game Two');
    expect(gameTitles[1]).toHaveTextContent('Game One');

    // Now re-view Game One and ensure it moves to the top without duplication
    fireEvent.click(screen.getByText('Game One'));
    await screen.findByRole('main', { name: /Game details for Game One/i });

    // Back to Recently Viewed via nav again
    const rvNavAgain = screen.getByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(rvNavAgain);

    // Use level: 1 to target only the h1 heading
    await screen.findByRole('heading', { level: 1, name: /Recently Viewed/i });

    // Check updated order
    const gameTitlesAfter = screen.getAllByText(/Game (One|Two)/);
    expect(gameTitlesAfter[0]).toHaveTextContent('Game One');
    expect(gameTitlesAfter[1]).toHaveTextContent('Game Two');
    expect(gameTitlesAfter).toHaveLength(2);
  });

  it('clears history and shows empty state when Clear History is confirmed', async () => {
    // Pre-populate recently viewed games
    recentlyViewedGames = [...mockGames];

    renderWithProviders(<App />);

    const recentlyViewedNav = await screen.findByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(recentlyViewedNav);

    // Use level: 1 to target only the h1 heading
    await screen.findByRole('heading', { level: 1, name: /Recently Viewed/i });

    // Verify games are shown
    expect(screen.getByText('Game One')).toBeInTheDocument();

    // Open confirmation dialog via page-level Clear History button
    fireEvent.click(screen.getByRole('button', { name: /^Clear History$/i }));

    // Confirm modal content
    const modal = await screen.findByRole('dialog');

    // Click the confirm Clear History button inside the modal
    const confirmButton = within(modal).getByRole('button', { name: /^Clear History$/i });
    fireEvent.click(confirmButton);

    // After clearing, the empty state message should be shown
    await waitFor(() => {
      expect(screen.getByText(/You have not viewed any games yet/i)).toBeInTheDocument();
    });
  });

  it('navigates to game details when clicking a recently viewed card and keeps that game as most recent', async () => {
    renderWithProviders(<App />);

    // View both games to seed history
    await screen.findByText('Game One');
    fireEvent.click(screen.getByText('Game One'));
    await screen.findByRole('main', { name: /Game details for Game One/i });
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));

    await screen.findByText('Game Two');
    fireEvent.click(screen.getByText('Game Two'));
    await screen.findByRole('main', { name: /Game details for Game Two/i });

    // Go to Recently Viewed
    const recentlyViewedNav = screen.getByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(recentlyViewedNav);

    // Use level: 1 to target only the h1 heading
    await screen.findByRole('heading', { level: 1, name: /Recently Viewed/i });

    // Click on Game Two title to go back to details
    fireEvent.click(screen.getByText('Game Two'));

    await screen.findByRole('main', { name: /Game details for Game Two/i });

    // Go back to Recently Viewed and ensure Game Two is still first
    const rvNavAgain = screen.getByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(rvNavAgain);

    // Use level: 1 to target only the h1 heading
    await screen.findByRole('heading', { level: 1, name: /Recently Viewed/i });

    const gameTitles = screen.getAllByText(/Game (One|Two)/);
    expect(gameTitles[0]).toHaveTextContent('Game Two');
  });
});