// filepath: client/tests/AdminPage/AdminGamesManagement.test.tsx
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';
import authService from '../../src/services/authService';
import * as gamesAdminService from '../../src/services/gamesAdminService';
import * as api from '../../src/services/api';
import * as adminReportsService from '../../src/services/adminReportsService';
import * as adminReviewsHooks from '../../src/hooks/adminReviews';
import * as adminReviewActionsHook from '../../src/hooks/useAdminReviewActions';

jest.mock('../../src/services/gamesAdminService', () => ({
  __esModule: true,
  getAdminGames: jest.fn().mockResolvedValue({ games: [] }),
  getAdminGameById: jest.fn().mockResolvedValue({
    game: {
      id: 'placeholder',
      slug: 'placeholder',
      title: 'Placeholder',
      studio: 'Placeholder Studio',
      description: 'Placeholder description',
      thumbnailUrl: '',
      genres: [],
      accessibilityTags: [],
      releaseYear: 2020,
    },
  }),
  createAdminGame: jest.fn(),
  updateAdminGame: jest.fn(),
  deleteAdminGame: jest.fn(),
}));

jest.mock('../../src/services/adminGameReportsService', () => ({
  __esModule: true,
  fetchGameReports: jest.fn().mockResolvedValue([]),
  replyToGameReport: jest.fn(),
}));

jest.mock('../../src/services/adminReportsService', () => ({
  __esModule: true,
  fetchGeneralReports: jest.fn().mockResolvedValue([]),
  replyToGeneralReport: jest.fn(),
  formatReportCode: jest.fn((report: { reportCode?: string; id: string }) => report.reportCode || report.id),
}));

jest.mock('../../src/hooks/adminReviews');
jest.mock('../../src/hooks/useAdminReviewActions');

jest.mock('../../src/services/adminReviewsService', () => ({
  __esModule: true,
  getAdminReviews: jest.fn().mockResolvedValue({ reviews: [], total: 0 }),
  getAdminReportedReviews: jest.fn().mockResolvedValue({ reports: [], total: 0 }),
  getAdminResolvedReviewReports: jest.fn().mockResolvedValue({ reports: [], total: 0 }),
  deleteReview: jest.fn(),
  replyToReviewReport: jest.fn(),
  resolveReviewReport: jest.fn(),
}));

jest.mock('../../src/services/api', () => ({
  __esModule: true,
  getGames: jest.fn().mockResolvedValue({ games: [], total: 0 }),
  getReviewStats: jest.fn().mockResolvedValue({ totalReviews: 0 }),
  getAuthHeaders: jest.fn(() => ({})),
  getGamesMetadata: jest.fn().mockResolvedValue({
    genres: [],
    accessibilityTags: [],
    platforms: [],
    featureGroups: [],
    tags: [],
    modes: [],
    inputMethods: [],
    publishers: [],
    developers: [],
    themes: [],
    languages: [],
    releaseYears: [],
  }),
}));

// Minimal table-state helpers to keep adminReviews hooks quiet in this suite
const makeTableState = <T,>(overrides: Partial<adminReviewsHooks.UseTableState<T>> = {}) => ({
  items: [],
  loading: false,
  error: null,
  searchTerm: '',
  page: 1,
  pageSize: 7,
  total: 0,
  setSearchTerm: jest.fn(),
  setPage: jest.fn(),
  refresh: jest.fn(),
  ...overrides,
});

const mockReviewsTable = adminReviewsHooks.useReviewsTable as jest.Mock;
const mockReportedTable = adminReviewsHooks.useReportedReviewsTable as jest.Mock;
const mockResolvedTable = adminReviewsHooks.useResolvedReportedReviewsTable as jest.Mock;
const mockActionsHook = adminReviewActionsHook.default as unknown as jest.Mock;

const mockAdminUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin' as const,
};

function setupAdminApp() {
  window.localStorage.setItem('user', JSON.stringify(mockAdminUser));
  window.localStorage.setItem('token', 'fake-admin-token');

  // Ensure core admin game services always return promises during setup
  (gamesAdminService.getAdminGames as jest.Mock).mockResolvedValue({ games: [mockGame] });
  (gamesAdminService.getAdminGameById as jest.Mock).mockResolvedValue({ game: mockGame });
  (gamesAdminService.updateAdminGame as jest.Mock).mockResolvedValue({ game: mockGame });

  jest.spyOn(authService, 'getCurrentUser').mockResolvedValue({
    success: true,
    message: 'ok',
    user: mockAdminUser,
  } as any);

  jest.spyOn(api, 'getGames').mockResolvedValue({
    games: [],
    total: 0,
  } as any);
  jest.spyOn(api, 'getReviewStats').mockResolvedValue({ totalReviews: 0 } as any);

  (adminReportsService.fetchGeneralReports as jest.Mock).mockResolvedValue([]);

  // keep admin review hooks quiet
  mockReviewsTable.mockReturnValue(makeTableState());
  mockReportedTable.mockReturnValue(makeTableState());
  mockResolvedTable.mockReturnValue(makeTableState());
  mockActionsHook.mockReturnValue({
    deleteReview: jest.fn(),
    sendAdminReply: jest.fn(),
    resolveReportedReview: jest.fn(),
    error: null,
  });

  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
}

const mockGame = {
  id: 'game-1',
  slug: 'mock-game',
  title: 'Mock Game',
  studio: 'Test Studio',
  description: 'Short and full description',
  thumbnailUrl: 'https://example.com/image.jpg',
  genres: ['Action'],
  accessibilityTags: ['Visual: Subtitles'],
  releaseYear: 2024,
};

const clickAdminButton = async () => {
  // Find the visual Admin label then click its enclosing button, which is how the navbar renders it.
  const adminLabel = await screen.findByText(/admin/i);
  const adminButton = adminLabel.closest('button');
  if (!adminButton) {
    throw new Error('Admin button not found');
  }
  fireEvent.click(adminButton);
};

describe('Admin Games Management acceptance criteria', () => {
  beforeEach(() => {
    (gamesAdminService.getAdminGames as jest.Mock).mockResolvedValue({ games: [mockGame] });
    (gamesAdminService.getAdminGameById as jest.Mock).mockResolvedValue({ game: mockGame });
    (gamesAdminService.createAdminGame as jest.Mock).mockResolvedValue({ game: mockGame });
    (gamesAdminService.updateAdminGame as jest.Mock).mockResolvedValue({ game: mockGame });
    (gamesAdminService.deleteAdminGame as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
    window.localStorage.clear();
  });

  test('Games Management tab shows sub-tabs and games table with correct columns', async () => {
    setupAdminApp();

    await clickAdminButton();

    const gamesTabPrimary = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTabPrimary);

    const gamesTabPanel = await screen.findByRole('tabpanel', { name: /games management/i });
    const inGamesPanel = within(gamesTabPanel);

    await inGamesPanel.findByRole('tab', { name: /^games$/i });

    const subTabs = inGamesPanel.getAllByRole('tab');
    expect(subTabs.some(t => t.textContent?.includes('Reported Games'))).toBe(true);
    expect(subTabs.some(t => t.textContent?.includes('Resolved Reported Games'))).toBe(true);

    const table = await inGamesPanel.findByRole('table', { name: /games management table/i });
    expect(table).toBeInTheDocument();

    expect(inGamesPanel.getByRole('columnheader', { name: /id/i })).toBeInTheDocument();
    expect(inGamesPanel.getByRole('columnheader', { name: /game title/i })).toBeInTheDocument();
    expect(inGamesPanel.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(inGamesPanel.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();

    expect(inGamesPanel.getByRole('searchbox', { name: /search games/i })).toBeInTheDocument();
  });

  test('Clicking Add New Game navigates to Add New Game form with expected sections', async () => {
    setupAdminApp();

    await clickAdminButton();

    const gamesTab = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTab);

    const addButton = await screen.findByRole('button', { name: /add new game/i });
    fireEvent.click(addButton);

    await screen.findByRole('heading', { name: /add new game/i });
    expect(screen.getByRole('heading', { name: /basic information/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /genres/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /accessibility features/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /app store links/i })).toBeInTheDocument();
  });

  test('Basic Information section shows required fields including Year of Release', async () => {
    setupAdminApp();

    await clickAdminButton();

    const gamesTab = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTab);

    const addButton = await screen.findByRole('button', { name: /add new game/i });
    fireEvent.click(addButton);

    await screen.findByRole('heading', { name: /basic information/i });

    expect(screen.getByLabelText(/game title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/developer\/studio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/short description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cover image url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/year of release/i)).toBeInTheDocument();
  });

  test('Genres section shows all available genres as checkboxes', async () => {
    setupAdminApp();

    await clickAdminButton();

    const gamesTab = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTab);

    const addButton = await screen.findByRole('button', { name: /add new game/i });
    fireEvent.click(addButton);

    await screen.findByRole('heading', { name: /genres/i });

    const genres = [
      'Action',
      'Adventure',
      'RPG',
      'Strategy',
      'Platformer',
      'Puzzle',
      'Simulation',
      'Sports',
      'Racing',
      'Fighting',
      'Indie',
      'Multiplayer',
    ];

    genres.forEach(genre => {
      expect(screen.getByRole('checkbox', { name: genre })).toBeInTheDocument();
    });
  });

  test('Accessibility Features section shows controls and validation requires at least one feature', async () => {
    setupAdminApp();

    await clickAdminButton();

    const gamesTab = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTab);

    const addButton = await screen.findByRole('button', { name: /add new game/i });
    fireEvent.click(addButton);

    await screen.findByRole('heading', { name: /accessibility features/i });

    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/feature name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add feature/i })).toBeInTheDocument();

    const addGameButton = screen.getByRole('button', { name: /add game/i });
    fireEvent.click(addGameButton);

    await waitFor(() => {
      expect(
        screen.getByText(/please add at least two accessibility features\./i),
      ).toBeInTheDocument();
    });
  });

  test('Submitting valid Add New Game form saves game and shows in list as Active', async () => {
    setupAdminApp();

    await clickAdminButton();

    const gamesTab = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTab);

    const addButton = await screen.findByRole('button', { name: /add new game/i });
    fireEvent.click(addButton);

    await screen.findByRole('heading', { name: /add new game/i });

    fireEvent.change(screen.getByLabelText(/game title/i), { target: { value: 'New Game' } });
    fireEvent.change(screen.getByLabelText(/developer\/studio/i), { target: { value: 'New Studio' } });
    fireEvent.change(screen.getByLabelText(/short description/i), {
      target: { value: 'A short description' },
    });
    fireEvent.change(screen.getByLabelText(/full description/i), {
      target: { value: 'A full description' },
    });
    fireEvent.change(screen.getByLabelText(/cover image url/i), {
      target: { value: 'https://example.com/new-game.jpg' },
    });
    fireEvent.change(screen.getByLabelText(/year of release/i), {
      target: { value: String(new Date().getFullYear()) },
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /action/i }));

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Visual' } });
    fireEvent.change(screen.getByLabelText(/feature name/i), {
      target: { value: 'Subtitles' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add feature/i }));

    fireEvent.change(screen.getByLabelText(/feature name/i), {
      target: { value: 'High contrast' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add feature/i }));

    fireEvent.click(screen.getByRole('button', { name: /add game/i }));

    await waitFor(() => {
      expect(gamesAdminService.createAdminGame).toHaveBeenCalled();
    });

    await screen.findByRole('heading', { name: /admin management/i });

    const gamesTabPrimary = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTabPrimary);

    const table = await screen.findByRole('table', { name: /games management table/i });
    expect(table).toBeInTheDocument();
    expect(within(table).getByText(/mock game/i)).toBeInTheDocument();

    const statusCells = within(table).getAllByText(/active/i);
    expect(statusCells.length).toBeGreaterThan(0);
  });

  test('Submitting Add New Game with missing fields shows validation errors', async () => {
    setupAdminApp();

    await clickAdminButton();

    const gamesTab = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTab);

    const addButton = await screen.findByRole('button', { name: /add new game/i });
    fireEvent.click(addButton);

    await screen.findByRole('heading', { name: /add new game/i });

    fireEvent.click(screen.getByRole('button', { name: /add game/i }));

    await waitFor(() => {
      expect(screen.getByText(/game title is required\./i)).toBeInTheDocument();
      expect(screen.getByText(/developer\/studio is required\./i)).toBeInTheDocument();
      expect(screen.getByText(/short description is required\./i)).toBeInTheDocument();
      expect(screen.getByText(/full description is required\./i)).toBeInTheDocument();
      expect(screen.getByText(/cover image url is required\./i)).toBeInTheDocument();
      expect(screen.getByText(/please select a year of release\./i)).toBeInTheDocument();
      expect(screen.getByText(/please select at least one genre\./i)).toBeInTheDocument();
      expect(
        screen.getByText(/please add at least two accessibility features\./i),
      ).toBeInTheDocument();
    });

    expect(gamesAdminService.createAdminGame).not.toHaveBeenCalled();
  });

  test('Edit Game form shows existing accessibility features as removable tags and validates on save', async () => {
    setupAdminApp();

    await clickAdminButton();

    const gamesTab = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTab);

    const manageButton = await screen.findByRole('button', { name: /manage/i });
    fireEvent.click(manageButton);

    await screen.findByRole('heading', { name: /accessibility features/i });

    const removeButtons = screen.queryAllByRole('button', { name: /remove accessibility feature/i });
    removeButtons.forEach(button => fireEvent.click(button));

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/please add at least two accessibility features\./i),
      ).toBeInTheDocument();
    });

    expect(gamesAdminService.updateAdminGame).not.toHaveBeenCalled();
  });
/*
  test('Successful save on Edit Game form shows success notification', async () => {
    setupAdminApp();

    await clickAdminButton();

    const gamesTab = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTab);

    const manageButton = await screen.findByRole('button', { name: /manage/i });
    fireEvent.click(manageButton);

    await screen.findByRole('heading', { name: /edit game: mock game/i });

    const removeButtonsBefore = screen.queryAllByRole('button', {
      name: /remove accessibility feature/i,
    });

    if (removeButtonsBefore.length < 2) {
      fireEvent.change(screen.getByLabelText(/category/i), {
        target: { value: 'Visual' },
      });
      fireEvent.change(screen.getByLabelText(/feature name/i), {
        target: { value: 'High contrast' },
      });
      fireEvent.click(screen.getByRole('button', { name: /add feature/i }));
    }

    fireEvent.change(screen.getByLabelText(/game title/i), {
      target: { value: 'Updated Mock Game' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(gamesAdminService.updateAdminGame).toHaveBeenCalled();
    });
  });
*/
  test('Delete Game removes game and redirects back to Games Management', async () => {
    setupAdminApp();

    await clickAdminButton();

    const gamesTab = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTab);

    const manageButton = await screen.findByRole('button', { name: /manage/i });
    fireEvent.click(manageButton);

    await screen.findByRole('heading', { name: /edit game: mock game/i });

    const deleteButton = screen.getByRole('button', { name: /delete game/i });
    fireEvent.click(deleteButton);

    const confirmDeleteButton = await screen.findByRole('button', { name: /^delete$/i });
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(gamesAdminService.deleteAdminGame).toHaveBeenCalledTimes(1);
    });

    await screen.findByRole('heading', { name: /admin management/i });
    const gamesTabPrimary = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTabPrimary);

    const table = await screen.findByRole('table', { name: /games management table/i });
    expect(table).toBeInTheDocument();
  });
});
