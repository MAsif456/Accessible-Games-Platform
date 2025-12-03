import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChangeEmailPasswordPage from '../../src/pages/ChangeEmailPasswordPage';
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

const renderChangePage = (onNavigate = jest.fn()) => {
  return render(<ChangeEmailPasswordPage onNavigate={onNavigate} />);
};

describe('ChangeEmailPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateUser.mockClear();
  });

  describe('Rendering', () => {
    it('should render email and password change forms', async () => {
      renderChangePage();

      await waitFor(() => {
        expect(screen.getByText('Change Email & Password')).toBeInTheDocument();
      });

      expect(screen.getByText('Change Email Address')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
      expect(screen.getByLabelText('New Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    });

    it('should show back to profile button', () => {
      renderChangePage();

      expect(screen.getByRole('button', { name: /back to profile/i })).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate back to profile when Back button is clicked', () => {
      const onNavigate = jest.fn();
      renderChangePage(onNavigate);

      fireEvent.click(screen.getByRole('button', { name: /back to profile/i }));

      expect(onNavigate).toHaveBeenCalledWith('/my-profile');
    });
  });

  describe('Email Change', () => {
    it('should show error for invalid email format', async () => {
      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Email Address')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('New Email Address');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      fireEvent.click(screen.getByRole('button', { name: /update email address/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error for empty email', async () => {
      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Email Address')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('New Email Address');
      fireEvent.change(emailInput, { target: { value: '   ' } });

      fireEvent.click(screen.getByRole('button', { name: /update email address/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error if new email is same as current email', async () => {
      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Email Address')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('New Email Address');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      fireEvent.click(screen.getByRole('button', { name: /update email address/i }));

      await waitFor(() => {
        expect(screen.getByText(/new email address must be different from your current email/i)).toBeInTheDocument();
      });
    });

    it('should successfully update email', async () => {
      (authService.updateAccount as jest.Mock).mockResolvedValue({
        success: true,
        user: { ...mockUser, email: 'newemail@example.com' },
      });

      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Email Address')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('New Email Address');
      fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

      fireEvent.click(screen.getByRole('button', { name: /update email address/i }));

      await waitFor(() => {
        expect(authService.updateAccount).toHaveBeenCalledWith({
          newEmail: 'newemail@example.com',
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/email address updated successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle email already in use error', async () => {
      (authService.updateAccount as jest.Mock).mockResolvedValue({
        success: false,
        message: 'This email is already in use',
      });

      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Email Address')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('New Email Address');
      fireEvent.change(emailInput, { target: { value: 'taken@example.com' } });

      fireEvent.click(screen.getByRole('button', { name: /update email address/i }));

      await waitFor(() => {
        expect(screen.getByText(/this email address is already in use/i)).toBeInTheDocument();
      });
    });

    it('should handle generic update error from response', async () => {
      (authService.updateAccount as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Server error',
      });

      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Email Address')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('New Email Address');
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

      fireEvent.click(screen.getByRole('button', { name: /update email address/i }));

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });

    it('should handle update failure without message', async () => {
      (authService.updateAccount as jest.Mock).mockResolvedValue({
        success: false,
      });

      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Email Address')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('New Email Address');
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

      fireEvent.click(screen.getByRole('button', { name: /update email address/i }));

      await waitFor(() => {
        expect(screen.getByText(/unable to update email address/i)).toBeInTheDocument();
      });
    });

    it('should handle network error during email update', async () => {
      (authService.updateAccount as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Email Address')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('New Email Address');
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

      fireEvent.click(screen.getByRole('button', { name: /update email address/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle already in use error from exception', async () => {
      (authService.updateAccount as jest.Mock).mockRejectedValue(
        new Error('Email is already in use by another account')
      );

      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Email Address')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText('New Email Address');
      fireEvent.change(emailInput, { target: { value: 'taken@example.com' } });

      fireEvent.click(screen.getByRole('button', { name: /update email address/i }));

      await waitFor(() => {
        expect(screen.getByText(/this email address is already in use/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Change', () => {
    it('should show error for password less than 8 characters', async () => {
      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Current Password'), {
        target: { value: 'oldpass123' },
      });
      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'short' },
      });
      fireEvent.change(screen.getByLabelText('Confirm New Password'), {
        target: { value: 'short' },
      });

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
      });
    });

    it('should show error for password without a number', async () => {
      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Current Password'), {
        target: { value: 'oldpass123' },
      });
      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'passwordonly' },
      });
      fireEvent.change(screen.getByLabelText('Confirm New Password'), {
        target: { value: 'passwordonly' },
      });

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must include at least one number/i)).toBeInTheDocument();
      });
    });

    it('should show error for mismatched passwords', async () => {
      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Current Password'), {
        target: { value: 'oldpass123' },
      });
      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'newpass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirm New Password'), {
        target: { value: 'different123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByText(/new password and confirm password must match/i)).toBeInTheDocument();
      });
    });

    it('should show error for empty current password', async () => {
      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'newpass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirm New Password'), {
        target: { value: 'newpass123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter your current password/i)).toBeInTheDocument();
      });
    });

    it('should successfully change password', async () => {
      (authService.updateAccount as jest.Mock).mockResolvedValue({
        success: true,
      });

      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      const currentPasswordInput = screen.getByLabelText('Current Password');
      const newPasswordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

      fireEvent.change(currentPasswordInput, { target: { value: 'oldpass123' } });
      fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(authService.updateAccount).toHaveBeenCalledWith({
          currentPassword: 'oldpass123',
          newPassword: 'newpass123',
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
      });

      // Check that form is cleared
      expect((currentPasswordInput as HTMLInputElement).value).toBe('');
      expect((newPasswordInput as HTMLInputElement).value).toBe('');
      expect((confirmPasswordInput as HTMLInputElement).value).toBe('');
    });

    it('should handle password change failure with message', async () => {
      (authService.updateAccount as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Current password is incorrect',
      });

      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Current Password'), {
        target: { value: 'wrongpass' },
      });
      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'newpass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirm New Password'), {
        target: { value: 'newpass123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
      });
    });

    it('should handle password change failure without message', async () => {
      (authService.updateAccount as jest.Mock).mockResolvedValue({
        success: false,
      });

      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Current Password'), {
        target: { value: 'oldpass123' },
      });
      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'newpass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirm New Password'), {
        target: { value: 'newpass123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByText(/unable to change password/i)).toBeInTheDocument();
      });
    });

    it('should handle network error during password change', async () => {
      (authService.updateAccount as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderChangePage();

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Current Password'), {
        target: { value: 'oldpass123' },
      });
      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'newpass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirm New Password'), {
        target: { value: 'newpass123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });
});
