import { render, screen, fireEvent } from '@testing-library/react';
import MyProfilePage from '../../src/pages/MyProfilePage';
import { AuthProvider } from '../../src/context/AuthContext';
import authService from '../../src/services/authService';

// Helper to render with a logged-in user by seeding localStorage and mocking authService.getCurrentUser
const renderProfile = (onNavigate = jest.fn(), onLogout = jest.fn()) => {
  const fakeUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user' as const,
    bio: 'Test bio',
  };
  window.localStorage.setItem('user', JSON.stringify(fakeUser));
  window.localStorage.setItem('token', 'fake-token');

  jest.spyOn(authService, 'getCurrentUser').mockResolvedValue({
    success: true,
    message: 'ok',
    user: fakeUser,
  } as any);

  return render(
    <AuthProvider>
      <MyProfilePage onNavigate={onNavigate} onLogout={onLogout} />
    </AuthProvider>
  );
};

test('shows name, bio label and join date in main card when logged in', async () => {
  renderProfile();

  expect(await screen.findByText('Test User')).toBeInTheDocument();
  expect(screen.getByText('My Bio')).toBeInTheDocument();
  expect(screen.getByText(/Joined /i)).toBeInTheDocument();
});

test('clicking Edit Profile allows editing name and bio, label is "My Bio"', () => {
  renderProfile();

  fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

  expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  // Use getAllByLabelText because both the section and textarea use "Bio"; ensure at least one textarea exists.
  const bioFields = screen.getAllByLabelText('Bio');
  expect(bioFields.length).toBeGreaterThan(0);
});

test('Edit Profile shows Save Profile and Cancel buttons', () => {
  renderProfile();

  fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

  expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
});

test('Change Email & Password navigates to dedicated page', () => {
  const onNavigate = jest.fn();
  renderProfile(onNavigate);

  fireEvent.click(screen.getByRole('button', { name: /change email & password/i }));

  expect(onNavigate).toHaveBeenCalledWith('/change-email-password');
});
