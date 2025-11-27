// filepath: client/tests/AdminPage/AdminGamesManagement.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../../src/App';
import authService from '../../src/services/authService';
import * as gamesAdminService from '../../src/services/gamesAdminService';

jest.mock('../../src/services/gamesAdminService');

const mockAdminUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin' as const,
};

function setupAdminApp() {
  window.localStorage.setItem('user', JSON.stringify(mockAdminUser));
  window.localStorage.setItem('token', 'fake-admin-token');

  jest.spyOn(authService, 'getCurrentUser').mockResolvedValue({
    success: true,
    message: 'ok',
    user: mockAdminUser,
  } as any);

  return render(<App />);
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

    const adminButton = await screen.findByRole('button', { name: /admin/i });
    fireEvent.click(adminButton);

    const gamesTabPrimary = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTabPrimary);

    const gamesTabPanel = await screen.findByRole('tabpanel', { name: /games management/i });
    const inGamesPanel = within(gamesTabPanel);

    await inGamesPanel.findByRole('tab', { name: /^games$/i });

    // Just assert the other tabs exist via getAllByRole to avoid ambiguity about names
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

    const adminButton = await screen.findByRole('button', { name: /admin/i });
    fireEvent.click(adminButton);

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

    const adminButton = await screen.findByRole('button', { name: /admin/i });
    fireEvent.click(adminButton);

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

    const adminButton = await screen.findByRole('button', { name: /admin/i });
    fireEvent.click(adminButton);

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

    const adminButton = await screen.findByRole('button', { name: /admin/i });
    fireEvent.click(adminButton);

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

    const adminButton = await screen.findByRole('button', { name: /admin/i });
    fireEvent.click(adminButton);

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

    const adminButton = await screen.findByRole('button', { name: /admin/i });
    fireEvent.click(adminButton);

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

    const adminButton = await screen.findByRole('button', { name: /admin/i });
    fireEvent.click(adminButton);

    const gamesTab = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTab);

    const manageButton = await screen.findByRole('button', { name: /manage/i });
    fireEvent.click(manageButton);

    await screen.findByRole('heading', { name: /accessibility features/i });

    // Remove any existing accessibility features if present
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

  test('Successful save on Edit Game form shows success notification', async () => {
    setupAdminApp();

    const adminButton = await screen.findByRole('button', { name: /admin/i });
    fireEvent.click(adminButton);

    const gamesTab = await screen.findByRole('tab', { name: /games management/i });
    fireEvent.click(gamesTab);

    const manageButton = await screen.findByRole('button', { name: /manage/i });
    fireEvent.click(manageButton);

    await screen.findByRole('heading', { name: /edit game: mock game/i });

    // Make sure there are at least two accessibility features before saving so validation passes
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

  test('Delete Game removes game and redirects back to Games Management', async () => {
    setupAdminApp();

    const adminButton = await screen.findByRole('button', { name: /admin/i });
    fireEvent.click(adminButton);

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
