import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../src/App';
import * as api from '../../src/services/api';
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

// Helper to render the app with providers
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <FavouritesProvider>{ui}</FavouritesProvider>
    </AuthProvider>
  );
}

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

jest.mock('../../src/services/api');

const mockedApi = api as jest.Mocked<typeof api>;

function mockAuthenticatedUser() {
  (window as any).localStorage.setItem('token', 'fake-token');
}

describe('Recently Viewed integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticatedUser();

    // Default getGames response
    mockedApi.getGames.mockResolvedValue({
      games: mockGames,
      currentPage: 1,
      pageSize: 9,
      totalResults: mockGames.length,
      totalPages: 1,
    } as any);

    mockedApi.addToRecentlyViewed.mockResolvedValue();
    mockedApi.getRecentlyViewed.mockResolvedValue({
      games: [],
      total: 0,
      showing: '0 of 0',
    });
    mockedApi.clearRecentlyViewed.mockResolvedValue();

    // Ensure GameDetailsPage's review fetching effect works during tests
    mockedApi.getReviews.mockResolvedValue([]);
  });

  it('adds a game to recently viewed when viewing details from Browse and shows it at top of Recently Viewed', async () => {
    const recentlyViewedGames: api.GameDto[] = [];

    // Track calls to addToRecentlyViewed and update getRecentlyViewed accordingly
    mockedApi.addToRecentlyViewed.mockImplementation(async gameId => {
      const found = mockGames.find(g => g.id === gameId)!;
      const existingIndex = recentlyViewedGames.findIndex(g => g.id === gameId);
      if (existingIndex !== -1) {
        recentlyViewedGames.splice(existingIndex, 1);
      }
      recentlyViewedGames.unshift(found);
      mockedApi.getRecentlyViewed.mockResolvedValue({
        games: [...recentlyViewedGames],
        total: recentlyViewedGames.length,
        showing: `1-${recentlyViewedGames.length} of ${recentlyViewedGames.length}`,
      });
    });

    renderWithProviders(<App />);

    // Wait for browse page games
    await screen.findByText('Game One');

    // Click first card to open details
    fireEvent.click(screen.getByText('Game One'));

    // Wait for details page to load
    await screen.findByRole('main', { name: /Game details for Game One/i });

    // Navigate to Recently Viewed via nav
    const recentlyViewedNav = screen.getByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(recentlyViewedNav);

    // Recently Viewed page should show the game and count at top
    await screen.findByRole('heading', { name: /Recently Viewed/i });
    expect(screen.getByText(/Showing 1-1 of 1 games/i)).toBeInTheDocument();
    expect(screen.getByText('Game One')).toBeInTheDocument();
  });

  it('shows viewed games with image, title, developer, description, genres and accessibility tags plus count text', async () => {
    mockedApi.getRecentlyViewed.mockResolvedValue({
      games: mockGames,
      total: mockGames.length,
      showing: `1-${mockGames.length} of ${mockGames.length}`,
    });

    renderWithProviders(<App />);

    // Navigate directly to Recently Viewed nav
    const recentlyViewedNav = await screen.findByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(recentlyViewedNav);

    await screen.findByRole('heading', { name: /Recently Viewed/i });

    // Count text
    expect(
      screen.getByText(`Showing 1-${mockGames.length} of ${mockGames.length} games`)
    ).toBeInTheDocument();

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
    const recentlyViewedGames: api.GameDto[] = [];

    mockedApi.addToRecentlyViewed.mockImplementation(async gameId => {
      const found = mockGames.find(g => g.id === gameId)!;
      const existingIndex = recentlyViewedGames.findIndex(g => g.id === gameId);
      if (existingIndex !== -1) {
        recentlyViewedGames.splice(existingIndex, 1);
      }
      recentlyViewedGames.unshift(found);
      mockedApi.getRecentlyViewed.mockResolvedValue({
        games: [...recentlyViewedGames],
        total: recentlyViewedGames.length,
        showing: `1-${recentlyViewedGames.length} of ${recentlyViewedGames.length}`,
      });
    });

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

    await screen.findByRole('heading', { name: /Recently Viewed/i });

    const cardsInitial = screen.getAllByRole('article');
    expect(cardsInitial[0]).toHaveTextContent('Game Two');
    expect(cardsInitial[1]).toHaveTextContent('Game One');

    // Now re-view Game One and ensure it moves to the top without duplication
    fireEvent.click(screen.getByText('Game One'));
    await screen.findByRole('main', { name: /Game details for Game One/i });

    // Back to Recently Viewed via nav again
    const rvNavAgain = screen.getByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(rvNavAgain);

    await screen.findByRole('heading', { name: /Recently Viewed/i });
    const cardsAfter = screen.getAllByRole('article');

    expect(cardsAfter[0]).toHaveTextContent('Game One');
    expect(cardsAfter[1]).toHaveTextContent('Game Two');
    expect(cardsAfter).toHaveLength(2);
  });

  it('clears history and shows empty state when Clear History is confirmed', async () => {
    mockedApi.getRecentlyViewed.mockResolvedValue({
      games: mockGames,
      total: mockGames.length,
      showing: `1-${mockGames.length} of ${mockGames.length}`,
    });

    renderWithProviders(<App />);

    const recentlyViewedNav = await screen.findByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(recentlyViewedNav);

    await screen.findByRole('heading', { name: /Recently Viewed/i });

    // Open confirmation dialog via page-level Clear History button
    fireEvent.click(
      screen.getByRole('button', { name: /^Clear History$/i })
    );

    // Confirm modal content
    const modal = await screen.findByRole('dialog', { name: /Clear Viewing History\?/i });

    // Click the confirm Clear History button inside the modal footer
    const confirmButton = within(modal).getByRole('button', { name: /^Clear History$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockedApi.clearRecentlyViewed).toHaveBeenCalled();
    });

    // After clearing, the empty state message should be shown somewhere on the page
    const emptyMessages = await screen.findAllByText(/You have not viewed any games yet/i);
    expect(emptyMessages.length).toBeGreaterThan(0);
  });

  it('navigates to game details when clicking a recently viewed card and keeps that game as most recent', async () => {
    const recentlyViewedGames: api.GameDto[] = [];

    mockedApi.addToRecentlyViewed.mockImplementation(async gameId => {
      const found = mockGames.find(g => g.id === gameId)!;
      const existingIndex = recentlyViewedGames.findIndex(g => g.id === gameId);
      if (existingIndex !== -1) {
        recentlyViewedGames.splice(existingIndex, 1);
      }
      recentlyViewedGames.unshift(found);
      mockedApi.getRecentlyViewed.mockResolvedValue({
        games: [...recentlyViewedGames],
        total: recentlyViewedGames.length,
        showing: `1-${recentlyViewedGames.length} of ${recentlyViewedGames.length}`,
      });
    });

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

    await screen.findByRole('heading', { name: /Recently Viewed/i });

    // Click the first card (Game Two) to go back to details
    const firstCard = screen.getAllByRole('article')[0];
    fireEvent.click(firstCard);

    await screen.findByRole('main', { name: /Game details for Game Two/i });

    // Go back to Recently Viewed and ensure Game Two is still first
    const rvNavAgain = screen.getByRole('menuitem', { name: /Recently Viewed/i });
    fireEvent.click(rvNavAgain);

    await screen.findByRole('heading', { name: /Recently Viewed/i });
    const cards = screen.getAllByRole('article');
    expect(cards[0]).toHaveTextContent('Game Two');
  });
});
