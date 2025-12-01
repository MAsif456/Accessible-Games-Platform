import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';
import authService from '../../src/services/authService';
import * as api from '../../src/services/api';

jest.mock('../../src/services/api');

// Helper to locate and click the Admin button by its visible text
const clickAdminButton = async () => {
  // Wait for the Admin text to appear in the navbar
  const adminText = await screen.findByText(/admin/i);
  const adminButton = adminText.closest('button');
  if (!adminButton) {
    throw new Error('Admin button not found');
  }
  fireEvent.click(adminButton);
};

// This test verifies that an admin user sees the Admin button in the navbar
// and that clicking it navigates to the Admin Management page.

test('admin user sees Admin button and can navigate to Admin Management page', async () => {
  const adminUser = {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin' as const,
  };

  window.localStorage.setItem('user', JSON.stringify(adminUser));
  window.localStorage.setItem('token', 'fake-admin-token');

  jest.spyOn(authService, 'getCurrentUser').mockResolvedValue({
    success: true,
    message: 'ok',
    user: adminUser,
  } as any);

  (api.getGames as jest.Mock).mockResolvedValue({ games: [], totalPages: 1, totalResults: 0 });

  render(<App />);

  // Admin button should appear in navbar for admin user
  await clickAdminButton();

  // After clicking Admin, the Admin Management heading should be visible
  const adminHeading = await screen.findByRole('heading', { name: /admin management/i });
  expect(adminHeading).toBeInTheDocument();
});
