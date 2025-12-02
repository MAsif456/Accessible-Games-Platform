import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';
import authService from '../../src/services/authService';
import * as api from '../../src/services/api';
// AuthProvider is already used inside App, no need to wrap again

jest.mock('../../src/services/api');

// This test simulates the My Account dropdown behaviour

test('My Account dropdown shows Profile and Inbox and navigates to Profile', async () => {
  const fakeUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user' as const,
  };
  window.localStorage.setItem('user', JSON.stringify(fakeUser));
  window.localStorage.setItem('token', 'fake-token');

  jest.spyOn(authService, 'getCurrentUser').mockResolvedValue({
    success: true,
    message: 'ok',
    user: fakeUser,
  } as any);

  (api.getGames as jest.Mock).mockResolvedValue({ games: [], totalPages: 1, totalResults: 0 });

  render(<App />);

  const myAccountButton = await screen.findByRole('button', { name: /my account/i });
  fireEvent.click(myAccountButton);

  const profileOption = await screen.findByText(/profile/i);
  const inboxOption = await screen.findByText(/inbox/i);

  expect(profileOption).toBeInTheDocument();
  expect(inboxOption).toBeInTheDocument();

  fireEvent.click(profileOption);

  expect(await screen.findByRole('heading', { name: /my profile/i })).toBeInTheDocument();
});
