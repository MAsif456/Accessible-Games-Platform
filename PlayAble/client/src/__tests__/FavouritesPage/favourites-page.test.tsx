import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FavouritesPage from '../../pages/FavouritesPage';
import { FavouritesProvider, FavouriteGameDto } from '../../context/FavouritesContext';
import { AuthProvider } from '../../context/AuthContext';

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ items: [], total: 0, page: 1, pageSize: 9 }),
  } as any);
});

afterEach(() => {
  (global.fetch as jest.Mock).mockReset();
});

jest.mock('../../context/AuthContext', () => {
  const actual = jest.requireActual('../../context/AuthContext');
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

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <FavouritesProvider>{ui}</FavouritesProvider>
    </AuthProvider>,
  );
};

describe('FavouritesPage', () => {
  test('shows empty state when there are no favourites', async () => {
    renderWithProviders(<FavouritesPage />);

    const heading = await screen.findByRole('heading', { name: /Your Favourites/i });
    expect(heading).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/No Favourites Yet/i)).toBeInTheDocument();
    });
  });

  test('renders favourite cards and pagination', async () => {
    const favourites: FavouriteGameDto[] = Array.from({ length: 10 }, (_, i) => ({
      id: `fav-${i + 1}`,
      title: `Favourite Game ${i + 1}`,
      studio: `Studio ${i + 1}`,
      description: `Description ${i + 1}`,
      thumbnailUrl: `/images/games/thumb-${i + 1}.jpg`,
      genres: ['Action'],
      accessibilityTags: ['Vision'],
    }));

    const fetchMock = global.fetch as jest.Mock;

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: favourites.slice(0, 9), total: 10, page: 1, pageSize: 9 }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: favourites.slice(9), total: 10, page: 2, pageSize: 9 }),
      } as any);

    renderWithProviders(<FavouritesPage />);

    const cards = await screen.findAllByRole('article');
    expect(cards.length).toBeGreaterThanOrEqual(1);

    const nextButton = await screen.findByRole('button', { name: /Next/i });
    expect(nextButton).toBeEnabled();

    await userEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 2/i)).toBeInTheDocument();
    });
  });

  test('opens and confirms remove favourite dialog', async () => {
    const favourites: FavouriteGameDto[] = [
      {
        id: 'fav-1',
        title: 'Favourite Game 1',
        studio: 'Studio 1',
        description: 'Description 1',
        thumbnailUrl: '/images/games/thumb-1.jpg',
        genres: ['Action'],
        accessibilityTags: ['Vision'],
      },
    ];

    const fetchMock = global.fetch as jest.Mock;

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: favourites, total: 1, page: 1, pageSize: 9 }),
      } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0, page: 1, pageSize: 9 }),
      } as any);

    renderWithProviders(<FavouritesPage />);

    const removeButton = await screen.findByRole('button', { name: /Remove Favourite/i });
    await userEvent.click(removeButton);

    const dialogTitle = await screen.findByRole('heading', { name: /Remove from Favourites\?/i });
    expect(dialogTitle).toBeInTheDocument();

    const confirmButton = await screen.findByRole('button', { name: /^Remove$/i });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/favourites/fav-1', expect.any(Object));
    });
  });
});
