/**
 * AuthService - Complete Test Coverage
 * Tests signup, login, logout, profile updates, account updates, and token management
 */

import authService, { SignupData, LoginData, AuthResponse } from '../authService';
import * as apiHelper from '../../utils/apiHelper';

// Mock apiHelper
jest.mock('../../utils/apiHelper');

// Mock global fetch
global.fetch = jest.fn();

describe('AuthService', () => {
  const mockUser = {
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user' as const,
    favourites: [],
    recentlyViewed: [],
    accessibilitySettings: {
      highContrast: false,
      screenReader: false,
      keyboardNavigation: true,
      voiceControl: false,
    },
  };

  const mockAuthResponse: AuthResponse = {
    success: true,
    message: 'Success',
    token: 'mock-jwt-token',
    user: mockUser,
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
    // Clear fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  describe('signup', () => {
    const signupData: SignupData = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    };

    it('should signup successfully and store token and user', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue(mockAuthResponse),
      };
      (apiHelper.apiPost as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.signup(signupData);

      expect(apiHelper.apiPost).toHaveBeenCalledWith('/api/auth/signup', signupData);
      expect(result).toEqual(mockAuthResponse);
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    });

    it('should handle signup failure without storing data', async () => {
      const failureResponse: AuthResponse = {
        success: false,
        message: 'Email already exists',
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue(failureResponse),
      };
      (apiHelper.apiPost as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.signup(signupData);

      expect(result).toEqual(failureResponse);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should not store data if token is missing', async () => {
      const responseWithoutToken: AuthResponse = {
        success: true,
        message: 'Success',
        user: mockUser,
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue(responseWithoutToken),
      };
      (apiHelper.apiPost as jest.Mock).mockResolvedValue(mockResponse);

      await authService.signup(signupData);

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('login', () => {
    const loginData: LoginData = {
      email: 'test@example.com',
      password: 'Password123',
    };

    it('should login successfully and store token and user', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue(mockAuthResponse),
      };
      (apiHelper.apiPost as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.login(loginData);

      expect(apiHelper.apiPost).toHaveBeenCalledWith('/api/auth/login', loginData);
      expect(result).toEqual(mockAuthResponse);
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    });

    it('should handle login failure without storing data', async () => {
      const failureResponse: AuthResponse = {
        success: false,
        message: 'Invalid credentials',
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue(failureResponse),
      };
      (apiHelper.apiPost as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.login(loginData);

      expect(result).toEqual(failureResponse);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should not store data if token is missing', async () => {
      const responseWithoutToken: AuthResponse = {
        success: false,
        message: 'Login failed',
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue(responseWithoutToken),
      };
      (apiHelper.apiPost as jest.Mock).mockResolvedValue(mockResponse);

      await authService.login(loginData);

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear localStorage', async () => {
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      const mockResponse = {
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (apiHelper.apiPost as jest.Mock).mockResolvedValue(mockResponse);

      await authService.logout();

      expect(apiHelper.apiPost).toHaveBeenCalledWith('/api/auth/logout', undefined, {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      });
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should clear localStorage even if API call fails', async () => {
      localStorage.setItem('token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (apiHelper.apiPost as jest.Mock).mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle logout when no token exists', async () => {
      await authService.logout();

      expect(apiHelper.apiPost).not.toHaveBeenCalled();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      localStorage.setItem('token', 'mock-jwt-token');

      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockAuthResponse),
      });

      const result = await authService.getCurrentUser();

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      });
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw error when no token exists', async () => {
      await expect(authService.getCurrentUser()).rejects.toThrow('No token found');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle unauthorized response', async () => {
      localStorage.setItem('token', 'invalid-token');

      const unauthorizedResponse = {
        success: false,
        message: 'Unauthorized',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(unauthorizedResponse),
      });

      const result = await authService.getCurrentUser();

      expect(result).toEqual(unauthorizedResponse);
    });
  });

  describe('isLoggedIn', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('token', 'mock-jwt-token');

      expect(authService.isLoggedIn()).toBe(true);
    });

    it('should return false when token does not exist', () => {
      expect(authService.isLoggedIn()).toBe(false);
    });

    it('should return false when token is empty string', () => {
      localStorage.setItem('token', '');

      expect(authService.isLoggedIn()).toBe(false);
    });
  });

  describe('getStoredUser', () => {
    it('should return stored user when exists', () => {
      localStorage.setItem('user', JSON.stringify(mockUser));

      const result = authService.getStoredUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when no user is stored', () => {
      const result = authService.getStoredUser();

      expect(result).toBeNull();
    });

    it('should parse JSON correctly', () => {
      const userWithBio = { ...mockUser, bio: 'Test bio' };
      localStorage.setItem('user', JSON.stringify(userWithBio));

      const result = authService.getStoredUser();

      expect(result).toEqual(userWithBio);
      expect(result?.bio).toBe('Test bio');
    });
  });

  describe('getToken', () => {
    it('should return token when exists', () => {
      localStorage.setItem('token', 'mock-jwt-token');

      const result = authService.getToken();

      expect(result).toBe('mock-jwt-token');
    });

    it('should return null when token does not exist', () => {
      const result = authService.getToken();

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const profileData = {
      name: 'Updated Name',
      bio: 'Updated bio',
    };

    beforeEach(() => {
      localStorage.setItem('token', 'mock-jwt-token');
    });

    it('should update profile successfully and sync localStorage', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name', bio: 'Updated bio' };
      const successResponse: AuthResponse = {
        success: true,
        message: 'Profile updated',
        user: updatedUser,
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(successResponse),
      };
      (apiHelper.apiPut as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.updateProfile(profileData);

      expect(apiHelper.apiPut).toHaveBeenCalledWith('/api/auth/profile', profileData, {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      });
      expect(result).toEqual(successResponse);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(updatedUser));
    });

    it('should handle update failure without changing localStorage', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));

      const failureResponse: AuthResponse = {
        success: false,
        message: 'Update failed',
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(failureResponse),
      };
      (apiHelper.apiPut as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.updateProfile(profileData);

      expect(result).toEqual(failureResponse);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    });

    it('should work without token', async () => {
      localStorage.removeItem('token');

      const mockResponse = {
        json: jest.fn().mockResolvedValue({ success: false, message: 'Unauthorized' }),
      };
      (apiHelper.apiPut as jest.Mock).mockResolvedValue(mockResponse);

      await authService.updateProfile(profileData);

      expect(apiHelper.apiPut).toHaveBeenCalledWith('/api/auth/profile', profileData, {
        headers: {},
      });
    });

    it('should handle partial updates', async () => {
      const nameOnly = { name: 'New Name' };
      const updatedUser = { ...mockUser, name: 'New Name' };
      const successResponse: AuthResponse = {
        success: true,
        message: 'Profile updated',
        user: updatedUser,
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(successResponse),
      };
      (apiHelper.apiPut as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.updateProfile(nameOnly);

      expect(result.user?.name).toBe('New Name');
      expect(localStorage.getItem('user')).toBe(JSON.stringify(updatedUser));
    });
  });

  describe('updateAccount', () => {
    const accountData = {
      newEmail: 'newemail@example.com',
      currentPassword: 'OldPass123',
      newPassword: 'NewPass456',
    };

    beforeEach(() => {
      localStorage.setItem('token', 'mock-jwt-token');
    });

    it('should update account successfully and sync localStorage', async () => {
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };
      const successResponse: AuthResponse = {
        success: true,
        message: 'Account updated',
        user: updatedUser,
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(successResponse),
      };
      (apiHelper.apiPut as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.updateAccount(accountData);

      expect(apiHelper.apiPut).toHaveBeenCalledWith('/api/auth/account', accountData, {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      });
      expect(result).toEqual(successResponse);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(updatedUser));
    });

    it('should handle account update failure', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));

      const failureResponse: AuthResponse = {
        success: false,
        message: 'Current password incorrect',
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(failureResponse),
      };
      (apiHelper.apiPut as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.updateAccount(accountData);

      expect(result).toEqual(failureResponse);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    });

    it('should work without token', async () => {
      localStorage.removeItem('token');

      const mockResponse = {
        json: jest.fn().mockResolvedValue({ success: false, message: 'Unauthorized' }),
      };
      (apiHelper.apiPut as jest.Mock).mockResolvedValue(mockResponse);

      await authService.updateAccount(accountData);

      expect(apiHelper.apiPut).toHaveBeenCalledWith('/api/auth/account', accountData, {
        headers: {},
      });
    });

    it('should handle email-only update', async () => {
      const emailOnly = { newEmail: 'newemail@example.com' };
      const updatedUser = { ...mockUser, email: 'newemail@example.com' };
      const successResponse: AuthResponse = {
        success: true,
        message: 'Email updated',
        user: updatedUser,
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(successResponse),
      };
      (apiHelper.apiPut as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.updateAccount(emailOnly);

      expect(result.user?.email).toBe('newemail@example.com');
    });

    it('should handle password-only update', async () => {
      const passwordOnly = {
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456',
      };
      const successResponse: AuthResponse = {
        success: true,
        message: 'Password updated',
        user: mockUser,
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(successResponse),
      };
      (apiHelper.apiPut as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.updateAccount(passwordOnly);

      expect(result.success).toBe(true);
    });

    it('should not update localStorage if user is missing in response', async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));

      const responseWithoutUser: AuthResponse = {
        success: true,
        message: 'Updated',
      };

      const mockResponse = {
        json: jest.fn().mockResolvedValue(responseWithoutUser),
      };
      (apiHelper.apiPut as jest.Mock).mockResolvedValue(mockResponse);

      await authService.updateAccount(accountData);

      // Should still have old user
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    });
  });
});
