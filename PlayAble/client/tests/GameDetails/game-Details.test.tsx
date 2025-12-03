import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

// Mock window APIs so we can assert behaviour without jsdom errors.
const originalWindowOpen = window.open;
const originalScrollTo = window.scrollTo;
const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;

beforeAll(() => {
  // @ts-ignore
  window.open = jest.fn();
  // @ts-ignore
  window.scrollTo = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

afterAll(() => {
  window.open = originalWindowOpen;
  window.scrollTo = originalScrollTo;
  if (originalScrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (window.HTMLElement.prototype as any).scrollIntoView;
  }
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

const makeReview = (id: string, userId = 'reviewer-1', likes = 0): api.ReviewDto => ({
  _id: id,
  userId,
  authorName: '',
  body: `Review ${id}`,
  likes,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
    expect(screen.getByText(/studio/i)).toBeInTheDocument();
    expect(screen.getByText(/genre/i)).toBeInTheDocument();
    expect(screen.getByAltText(/game thumbnail/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /accessibility features/i })).toBeInTheDocument();
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

    const modal = await screen.findByRole('dialog');
    const modalTitle = await screen.findByText(/you are about to leave playable/i);
    expect(modalTitle).toBeInTheDocument();
    const description = within(modal).getByText(/open this game in/i);
    expect(description).toHaveTextContent(/App Store/i);
  });

  test('external link confirmation allows proceed or cancel without leaving on cancel', async () => {
    await renderAndNavigateToFirstGame();

    const appStoreButton = screen.getByRole('button', { name: /download on the app store/i });
    fireEvent.click(appStoreButton);

    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    let proceedButton = screen.getByRole('button', { name: /proceed/i });

    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(
        screen.queryByText(/you are leaving playable/i)
      ).not.toBeInTheDocument();
    });

    expect(window.open).not.toHaveBeenCalled();

    // Click App Store button again
    fireEvent.click(appStoreButton);
    await screen.findByText(/you are about to leave playable/i);
    proceedButton = screen.getByRole('button', { name: /proceed/i });
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(window.open).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  test('load more reviews reveals additional items and disables when all loaded', async () => {
    mockedApi.getReviews.mockResolvedValueOnce([
      makeReview('1'),
      makeReview('2'),
      makeReview('3'),
      makeReview('4'),
      makeReview('5'),
      makeReview('6'),
    ]);

    await renderAndNavigateToFirstGame();

    await screen.findByText(/Review 1/);

    const loadMoreButton = await screen.findByRole('button', { name: /load more reviews/i });
    fireEvent.click(loadMoreButton);

    const reviewsList = document.getElementById('game-details__reviews-list');
    expect(reviewsList).not.toBeNull();
    await waitFor(() => {
      const cards = (reviewsList as HTMLElement).querySelectorAll('.game-details__review-card');
      expect(cards.length).toBe(6);
    });

    expect(loadMoreButton).toHaveAttribute('aria-disabled', 'true');
    expect(loadMoreButton).toHaveTextContent(/all reviews loaded/i);
  });

  test('like button toggles counts optimistically and calls API', async () => {
    mockedApi.getReviews.mockResolvedValueOnce([makeReview('like-1', 'someone', 0)]);
    mockedApi.toggleReviewLike.mockResolvedValue({} as any);

    await renderAndNavigateToFirstGame();

    const likeButton = await screen.findByRole('button', { name: /^0$/ });
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^1$/ })).toBeInTheDocument();
    });

    expect(mockedApi.toggleReviewLike).toHaveBeenCalledWith('like-1', true);
  });

  test('review owned by user renders delete button', async () => {
    mockedApi.getReviews.mockResolvedValueOnce([makeReview('mine', 'test-user', 0)]);
    await renderAndNavigateToFirstGame();

    const deleteButton = await screen.findByRole('button', { name: /delete/i });
    expect(deleteButton).toBeInTheDocument();
  });
});
