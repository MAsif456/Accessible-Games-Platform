import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyProfilePage from '../../src/pages/MyProfilePage';
import * as AuthContextModule from '../../src/context/AuthContext';
import authService from '../../src/services/authService';

// Mock authService
jest.mock('../../src/services/authService');

const mockUser = {
  id: 'user123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user' as const,
  bio: 'Test bio',
  createdAt: new Date('2024-01-01').toISOString(),
};

const mockUpdateUser = jest.fn();

// Mock AuthContext to provide user directly
jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
  user: mockUser,
  isLoading: false,
  isAuthenticated: true,
  signup: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  updateUser: mockUpdateUser,
  userSettings: null,
  refreshUserSettings: jest.fn(),
  updateUserSettingsState: jest.fn(),
});

// Helper to render with a logged-in user
const renderProfile = (onNavigate = jest.fn(), onLogout = jest.fn()) => {
  return render(
    <MyProfilePage onNavigate={onNavigate} onLogout={onLogout} />
  );
};

describe('MyProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUser.mockClear();
  });

  describe('Rendering', () => {
    it('should render profile page with user information', async () => {
      renderProfile();

      // Wait for page to render
      await waitFor(() => {
        expect(screen.getByText('My Profile')).toBeInTheDocument();
      });

      // Check for user info - should show test user since we're mocking AuthContext
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('My Bio')).toBeInTheDocument();
      expect(screen.getByText(/Joined /i)).toBeInTheDocument();
    });

    it('should display user avatar with initials', async () => {
      renderProfile();

      // Avatar should show test user initials (TE)
      await waitFor(() => {
        const avatars = screen.getAllByText('TE');
        expect(avatars.length).toBeGreaterThan(0);
      });
    });

    it('should show Edit Profile button', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });

    it('should show Log Out button', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
      });
    });

    it('should show Security section with Change Email & Password button', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /change email & password/i })).toBeInTheDocument();
    });

    it('should display membership duration', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByText(/Member for \d+ day/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to change email/password page', async () => {
      const onNavigate = jest.fn();
      renderProfile(onNavigate);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /change email & password/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /change email & password/i }));

      expect(onNavigate).toHaveBeenCalledWith('/change-email-password');
    });

    it('should call logout handler when Log Out is clicked', async () => {
      const onLogout = jest.fn().mockResolvedValue(undefined);
      renderProfile(jest.fn(), onLogout);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /log out/i }));

      await waitFor(() => {
        expect(onLogout).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    it('should enter edit mode when Edit Profile is clicked', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

      expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      const bioFields = screen.getAllByLabelText('Bio');
      expect(bioFields.length).toBeGreaterThan(0);
    });

    it('should allow editing name', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

      const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      expect(nameInput.value).toBe('Updated Name');
    });

    it('should allow editing bio', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

      const bioTextarea = screen.getByRole('textbox', { name: /bio/i }) as HTMLTextAreaElement;
      fireEvent.change(bioTextarea, { target: { value: 'Updated bio' } });

      expect(bioTextarea.value).toBe('Updated bio');
    });

    it('should cancel edit mode and revert changes', async () => {
      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(nameInput, { target: { value: 'Changed Name' } });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      // After cancel, should exit edit mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      // Name should revert to original test user
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should save profile changes successfully', async () => {
      (authService.updateProfile as jest.Mock).mockResolvedValue({
        success: true,
        user: { ...mockUser, name: 'Updated Name', bio: 'Updated bio' },
      });

      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

      const nameInput = screen.getByLabelText(/full name/i);
      const bioTextarea = screen.getByRole('textbox', { name: /bio/i });

      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      fireEvent.change(bioTextarea, { target: { value: 'Updated bio' } });

      fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

      await waitFor(() => {
        expect(authService.updateProfile).toHaveBeenCalledWith({
          name: 'Updated Name',
          bio: 'Updated bio',
        });
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });
    });

    it('should use default name if edit name is empty', async () => {
      (authService.updateProfile as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      renderProfile();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));

      const nameInput = screen.getByLabelText(/full name/i);
      fireEvent.change(nameInput, { target: { value: '   ' } }); // Whitespace only

      fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

      // updateProfile should be called with original name (falls back to user.name)
      await waitFor(() => {
        expect(authService.updateProfile).toHaveBeenCalledWith({
          name: 'Test User', // Should use original name
          bio: expect.any(String),
        });
      });
    });
  });

  describe('Membership Info', () => {
    it('should display joined date correctly', async () => {
      renderProfile();

      // Just check that a joined date is displayed
      await waitFor(() => {
        expect(screen.getByText(/Joined /i)).toBeInTheDocument();
      });
    });

    it('should handle user without createdAt date', async () => {
      const userWithoutDate = { ...mockUser };
      delete (userWithoutDate as any).createdAt;

      // Mock AuthContext with user without createdAt
      jest.spyOn(AuthContextModule, 'useAuth').mockReturnValueOnce({
        user: userWithoutDate,
        isLoading: false,
        isAuthenticated: true,
        signup: jest.fn(),
        login: jest.fn(),
        logout: jest.fn(),
        updateUser: mockUpdateUser,
        userSettings: null,
        refreshUserSettings: jest.fn(),
        updateUserSettingsState: jest.fn(),
      });

      render(<MyProfilePage onNavigate={jest.fn()} onLogout={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Member for \d+ day/i)).toBeInTheDocument();
      });
    });
  });

  describe('Bio Display', () => {
    it('should display user bio when not editing', async () => {
      renderProfile();

      // Should show test bio since we're mocking AuthContext
      await waitFor(() => {
        expect(screen.getByText('Test bio')).toBeInTheDocument();
      });
    });

    it('should display default bio if user has no bio', async () => {
      const userWithoutBio = { ...mockUser };
      delete userWithoutBio.bio;

      // Mock AuthContext with user without bio
      jest.spyOn(AuthContextModule, 'useAuth').mockReturnValueOnce({
        user: userWithoutBio,
        isLoading: false,
        isAuthenticated: true,
        signup: jest.fn(),
        login: jest.fn(),
        logout: jest.fn(),
        updateUser: mockUpdateUser,
        userSettings: null,
        refreshUserSettings: jest.fn(),
        updateUserSettingsState: jest.fn(),
      });

      render(<MyProfilePage onNavigate={jest.fn()} onLogout={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Passionate gamer who loves accessible games/i)).toBeInTheDocument();
      });
    });
  });
});
