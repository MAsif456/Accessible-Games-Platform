import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/App';
import * as api from '../../src/services/api';
import settingsApi from '../../src/services/settingsApi';
import { AuthProvider } from '../../src/context/AuthContext';
import { FavouritesProvider } from '../../src/context/FavouritesContext';

// Polyfill TextEncoder for react-router-dom and other libraries that expect it in the test environment
import { TextEncoder as NodeTextEncoder } from 'util';
// @ts-ignore
if (typeof global.TextEncoder === 'undefined') {
  // @ts-ignore
  global.TextEncoder = NodeTextEncoder;
}

// Mock AuthContext to return authenticated user
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

// Mock the API module
jest.mock('../../src/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

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

// Mock game data
const mockGames: api.GameDto[] = [
  {
    id: '1',
    _id: '1',
    slug: 'test-game',
    title: 'Test Game',
    studio: 'Test Studio',
    description: 'A test game description',
    thumbnailUrl: '/test-game.png',
    genres: ['Action', 'Adventure'],
    accessibilityTags: ['Vision', 'Motor'],
    releaseYear: 2023,
  },
];

// Helper to render the app with providers
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <FavouritesProvider>{ui}</FavouritesProvider>
    </AuthProvider>
  );
}

// Mock window.open so we can assert external navigation without actually leaving the test environment
const originalWindowOpen = window.open;

beforeAll(() => {
  // @ts-ignore
  window.open = jest.fn();
});

afterAll(() => {
  window.open = originalWindowOpen;
});

beforeEach(() => {
  jest.clearAllMocks();

  // Reset window.open mock
  (window.open as jest.Mock).mockClear();

  // Mock authenticated user token
  (window as any).localStorage.setItem('token', 'fake-token');

  // Mock settings API to prevent "Failed to load accessibility settings" error
  (settingsApi.getSettings as jest.Mock).mockResolvedValue({
    voiceInput: false,
    captions: false,
    microphoneActive: false,
    highContrastMode: false,
    highContrastTheme: 'tidepool',
    reducedMotion: false,
    darkMode: false,
  });

  // Mock getGames for Browse page
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

  // Mock reviews
  mockedApi.getReviews.mockResolvedValue([]);

  // Mock recently viewed
  mockedApi.addToRecentlyViewed.mockResolvedValue();
  mockedApi.getRecentlyViewed.mockResolvedValue({
    games: [],
    total: 0,
    showing: '0 of 0',
  });
});

// Helper: render the whole app starting from browse and click into first game
async function renderAndNavigateToFirstGame() {
  renderWithProviders(<App />);

  // Wait for the game title to appear on the Browse page
  await screen.findByText('Test Game');

  // Click on the game card to open details
  fireEvent.click(screen.getByText('Test Game'));

  // Wait for details page to load
  await screen.findByRole('main', { name: /Game details for Test Game/i });
}

describe('Game Details Page layout and behaviour', () => {
  test('shows core game info above the fold after navigating from catalogue', async () => {
    await renderAndNavigateToFirstGame();

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Test Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Action/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Test Game/i)).toBeInTheDocument();
    // Use getAllByText since there are multiple matches, and check at least one exists
    const accessibilityElements = screen.getAllByText(/accessibility features/i);
    expect(accessibilityElements.length).toBeGreaterThan(0);
  });

  test('shows About This Game and release/download section when scrolled', async () => {
    await renderAndNavigateToFirstGame();

    const aboutHeading = await screen.findByRole('heading', { name: /about this game/i });
    expect(aboutHeading).toBeInTheDocument();

    const releaseLabel = screen.getByText(/release year/i);
    const downloadHeading = screen.getByText(/download now/i);
    expect(
      releaseLabel.compareDocumentPosition(downloadHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test('shows Accessibility Reviews and See Reviews link in lower section', async () => {
    await renderAndNavigateToFirstGame();

    const reviewsHeading = screen.getByRole('heading', { name: /accessibility reviews/i });
    expect(reviewsHeading).toBeInTheDocument();

    // Check for the See Reviews section heading
    const seeReviewsHeading = screen.getByRole('heading', { name: /see reviews/i });
    expect(seeReviewsHeading).toBeInTheDocument();
  });

  test('shows separate, clearly labelled App Store and Play Store download buttons', async () => {
    await renderAndNavigateToFirstGame();

    const appStoreButton = screen.getByRole('button', { name: /download on the app store/i });
    const playStoreButton = screen.getByRole('button', { name: /get it on google play/i });

    expect(appStoreButton).toBeInTheDocument();
    expect(playStoreButton).toBeInTheDocument();
  });

  test('clicking external download shows confirmation with destination name', async () => {
    await renderAndNavigateToFirstGame();

    const appStoreButton = screen.getByRole('button', { name: /download on the app store/i });
    fireEvent.click(appStoreButton);

    const modalTitle = await screen.findByText(/you are leaving playable/i);
    expect(modalTitle).toBeInTheDocument();

    // Use getAllByText since there are multiple matches for "App Store"
    const appStoreTexts = screen.getAllByText(/app store/i);
    expect(appStoreTexts.length).toBeGreaterThan(0);
  });

  test('external link confirmation allows proceed or cancel without leaving on cancel', async () => {
    await renderAndNavigateToFirstGame();

    const appStoreButton = screen.getByRole('button', { name: /download on the app store/i });
    fireEvent.click(appStoreButton);

    const cancelButton = await screen.findByRole('button', { name: /cancel/i });

    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(
        screen.queryByText(/you are leaving playable/i)
      ).not.toBeInTheDocument();
    });

    expect(window.open).not.toHaveBeenCalled();

    // Click App Store button again
    fireEvent.click(appStoreButton);

    // Wait for modal to appear
    await screen.findByText(/you are leaving playable/i);

    // Find and click the Proceed button
    const proceedButton = await screen.findByRole('button', { name: /proceed/i });
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(window.open).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});