/**
 * AuthContext - Complete Test Coverage
 * Tests provider, hook, authentication actions, user settings, and error handling
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../AuthContext';
import authService from '../../services/authService';
import settingsApi from '../../services/settingsApi';
import * as accessibility from '../../utils/accessibility';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../services/settingsApi');
jest.mock('../../utils/accessibility');

describe('AuthContext', () => {
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

  const mockUserSettings = {
    highContrast: false,
    fontSize: 16,
    textToSpeech: false,
    keyboardShortcuts: true,
    colorBlindMode: 'none' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (authService.getStoredUser as jest.Mock).mockReturnValue(null);
    (authService.getToken as jest.Mock).mockReturnValue(null);
    (authService.getCurrentUser as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Not authenticated',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Provider and Hook', () => {
    it('should throw error when useAuth is used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        useAuth();
        return <div>Test</div>;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'useAuth must be used within an AuthProvider'
      );

      consoleError.mockRestore();
    });

    it('should provide context value to children', async () => {
      const TestComponent = () => {
        const { user, isLoading, isAuthenticated } = useAuth();
        return (
          <div>
            <div data-testid="user">{user ? user.name : 'null'}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
            <div data-testid="authenticated">{isAuthenticated.toString()}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });

    it('should initialize with loading true', () => {
      (authService.getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {}));
      (authService.getStoredUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getToken as jest.Mock).mockReturnValue('mock-token');

      const TestComponent = () => {
        const { isLoading } = useAuth();
        return <div data-testid="loading-state">{isLoading.toString()}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
    });
  });

  describe('Initial Authentication Check', () => {
    it('should load user from localStorage on mount if token is valid', async () => {
      (authService.getStoredUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getToken as jest.Mock).mockReturnValue('valid-token');
      (authService.getCurrentUser as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
      });
      (settingsApi.getSettings as jest.Mock).mockResolvedValue(mockUserSettings);

      const TestComponent = () => {
        const { user, isLoading } = useAuth();
        return (
          <div>
            <div data-testid="user-name">{user?.name || 'null'}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
      expect(authService.getCurrentUser).toHaveBeenCalled();
      expect(settingsApi.getSettings).toHaveBeenCalledWith('user123');
    });

    it('should logout if stored token is invalid', async () => {
      (authService.getStoredUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getToken as jest.Mock).mockReturnValue('invalid-token');
      (authService.getCurrentUser as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Invalid token',
      });
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const TestComponent = () => {
        const { user, isLoading } = useAuth();
        return (
          <div>
            <div data-testid="user">{user ? 'logged-in' : 'null'}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(authService.logout).toHaveBeenCalled();
    });

    it('should handle getCurrentUser failure by logging out', async () => {
      (authService.getStoredUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getToken as jest.Mock).mockReturnValue('token');
      (authService.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Network error'));
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const TestComponent = () => {
        const { user } = useAuth();
        return <div data-testid="user">{user ? 'logged-in' : 'null'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalled();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    it('should not load user if no stored user or token', async () => {
      const TestComponent = () => {
        const { user, isLoading } = useAuth();
        return (
          <div>
            <div data-testid="user">{user ? 'logged-in' : 'null'}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(authService.getCurrentUser).not.toHaveBeenCalled();
    });

    it('should handle error during auth initialisation', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (authService.getStoredUser as jest.Mock).mockImplementation(() => {
        throw new Error('Storage error');
      });

      const TestComponent = () => {
        const { isLoading } = useAuth();
        return <div data-testid="loading">{isLoading.toString()}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Auth initialisation error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Signup', () => {
    it('should signup successfully and set user', async () => {
      (authService.signup as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'new-token',
      });
      (settingsApi.getSettings as jest.Mock).mockResolvedValue(mockUserSettings);

      const TestComponent = () => {
        const { signup, user } = useAuth();
        return (
          <div>
            <button
              onClick={() =>
                signup({
                  fullName: 'Test User',
                  email: 'test@example.com',
                  password: 'Password123',
                  confirmPassword: 'Password123',
                })
              }
              data-testid="signup-btn"
            >
              Signup
            </button>
            <div data-testid="user-name">{user?.name || 'null'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-name')).toHaveTextContent('null');
      });

      await act(async () => {
        screen.getByTestId('signup-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
      });

      expect(settingsApi.getSettings).toHaveBeenCalledWith('user123');
    });

    it('should handle signup failure', async () => {
      (authService.signup as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Email already exists',
      });

      const TestComponent = () => {
        const { signup, user } = useAuth();
        return (
          <div>
            <button
              onClick={() =>
                signup({
                  fullName: 'Test User',
                  email: 'test@example.com',
                  password: 'Password123',
                  confirmPassword: 'Password123',
                })
              }
              data-testid="signup-btn"
            >
              Signup
            </button>
            <div data-testid="user">{user ? 'logged-in' : 'null'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });

      await act(async () => {
        screen.getByTestId('signup-btn').click();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    it('should handle signup error with error message', async () => {
      (authService.signup as jest.Mock).mockRejectedValue(new Error('Network error'));

      const TestComponent = () => {
        const { signup } = useAuth();
        const [result, setResult] = React.useState<any>(null);
        return (
          <div>
            <button
              onClick={async () => {
                const res = await signup({
                  fullName: 'Test',
                  email: 'test@example.com',
                  password: 'Pass123',
                  confirmPassword: 'Pass123',
                });
                setResult(res);
              }}
              data-testid="signup-btn"
            >
              Signup
            </button>
            <div data-testid="result">{result ? result.message : 'null'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('null');
      });

      await act(async () => {
        screen.getByTestId('signup-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('Network error');
      });
    });
  });

  describe('Login', () => {
    it('should login successfully and set user', async () => {
      (authService.login as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'auth-token',
      });
      (settingsApi.getSettings as jest.Mock).mockResolvedValue(mockUserSettings);

      const TestComponent = () => {
        const { login, user } = useAuth();
        return (
          <div>
            <button
              onClick={() =>
                login({
                  email: 'test@example.com',
                  password: 'Password123',
                })
              }
              data-testid="login-btn"
            >
              Login
            </button>
            <div data-testid="user-name">{user?.name || 'null'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-name')).toHaveTextContent('null');
      });

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
      });

      expect(settingsApi.getSettings).toHaveBeenCalledWith('user123');
    });

    it('should handle login failure', async () => {
      (authService.login as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
      });

      const TestComponent = () => {
        const { login, user } = useAuth();
        return (
          <div>
            <button
              onClick={() =>
                login({
                  email: 'test@example.com',
                  password: 'Wrong123',
                })
              }
              data-testid="login-btn"
            >
              Login
            </button>
            <div data-testid="user">{user ? 'logged-in' : 'null'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    it('should handle login error with default message', async () => {
      (authService.login as jest.Mock).mockRejectedValue({});

      const TestComponent = () => {
        const { login } = useAuth();
        const [result, setResult] = React.useState<any>(null);
        return (
          <div>
            <button
              onClick={async () => {
                const res = await login({
                  email: 'test@example.com',
                  password: 'Pass123',
                });
                setResult(res);
              }}
              data-testid="login-btn"
            >
              Login
            </button>
            <div data-testid="result">{result ? result.message : 'null'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('null');
      });

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('Login failed');
      });
    });
  });

  describe('Logout', () => {
    it('should logout successfully and clear user', async () => {
      (authService.getStoredUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getToken as jest.Mock).mockReturnValue('token');
      (authService.getCurrentUser as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
      });
      (settingsApi.getSettings as jest.Mock).mockResolvedValue(mockUserSettings);
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const TestComponent = () => {
        const { logout, user } = useAuth();
        return (
          <div>
            <button onClick={logout} data-testid="logout-btn">
              Logout
            </button>
            <div data-testid="user">{user ? user.name : 'null'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('Test User');
      });

      await act(async () => {
        screen.getByTestId('logout-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });

      expect(authService.logout).toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (authService.logout as jest.Mock).mockRejectedValue(new Error('Logout failed'));

      const TestComponent = () => {
        const { logout } = useAuth();
        return (
          <button onClick={logout} data-testid="logout-btn">
            Logout
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('logout-btn')).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('logout-btn').click();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('UpdateUser', () => {
    it('should update user and localStorage', async () => {
      const TestComponent = () => {
        const { updateUser, user } = useAuth();
        return (
          <div>
            <button
              onClick={() => updateUser({ ...mockUser, name: 'Updated Name' })}
              data-testid="update-btn"
            >
              Update
            </button>
            <div data-testid="user-name">{user?.name || 'null'}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-name')).toHaveTextContent('null');
      });

      await act(async () => {
        screen.getByTestId('update-btn').click();
      });

      expect(screen.getByTestId('user-name')).toHaveTextContent('Updated Name');
      expect(localStorage.getItem('user')).toContain('Updated Name');
    });
  });

  describe('User Settings', () => {
    it('should load user settings on successful authentication', async () => {
      (authService.getStoredUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getToken as jest.Mock).mockReturnValue('token');
      (authService.getCurrentUser as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
      });
      (settingsApi.getSettings as jest.Mock).mockResolvedValue(mockUserSettings);

      const TestComponent = () => {
        const { userSettings } = useAuth();
        return <div data-testid="settings">{userSettings ? 'loaded' : 'null'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('settings')).toHaveTextContent('loaded');
      });

      expect(accessibility.applyAccessibilityPreferences).toHaveBeenCalledWith(mockUserSettings);
    });

    it('should handle settings loading failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (authService.getStoredUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getToken as jest.Mock).mockReturnValue('token');
      (authService.getCurrentUser as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
      });
      (settingsApi.getSettings as jest.Mock).mockRejectedValue(new Error('Settings error'));

      const TestComponent = () => {
        const { userSettings } = useAuth();
        return <div data-testid="settings">{userSettings ? 'loaded' : 'null'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load accessibility settings:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should refresh user settings', async () => {
      (authService.getStoredUser as jest.Mock).mockReturnValue(mockUser);
      (authService.getToken as jest.Mock).mockReturnValue('token');
      (authService.getCurrentUser as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
      });
      (settingsApi.getSettings as jest.Mock).mockResolvedValue(mockUserSettings);

      const TestComponent = () => {
        const { refreshUserSettings } = useAuth();
        return (
          <button onClick={refreshUserSettings} data-testid="refresh-btn">
            Refresh
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('refresh-btn')).toBeInTheDocument();
      });

      // Clear the initial call
      (settingsApi.getSettings as jest.Mock).mockClear();

      await act(async () => {
        screen.getByTestId('refresh-btn').click();
      });

      await waitFor(() => {
        expect(settingsApi.getSettings).toHaveBeenCalledWith('user123');
      });
    });

    it('should not refresh settings if no user', async () => {
      const TestComponent = () => {
        const { refreshUserSettings } = useAuth();
        return (
          <button onClick={refreshUserSettings} data-testid="refresh-btn">
            Refresh
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('refresh-btn')).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('refresh-btn').click();
      });

      expect(settingsApi.getSettings).not.toHaveBeenCalled();
    });

    it('should update user settings state and apply preferences', async () => {
      const TestComponent = () => {
        const { updateUserSettingsState } = useAuth();
        return (
          <button
            onClick={() => updateUserSettingsState(mockUserSettings)}
            data-testid="update-settings-btn"
          >
            Update Settings
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('update-settings-btn')).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('update-settings-btn').click();
      });

      expect(accessibility.applyAccessibilityPreferences).toHaveBeenCalledWith(mockUserSettings);
    });

    it('should handle null settings update', async () => {
      const TestComponent = () => {
        const { updateUserSettingsState } = useAuth();
        return (
          <button
            onClick={() => updateUserSettingsState(null)}
            data-testid="clear-settings-btn"
          >
            Clear Settings
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('clear-settings-btn')).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('clear-settings-btn').click();
      });

      expect(accessibility.applyAccessibilityPreferences).toHaveBeenCalledWith(null);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is logged in', async () => {
      (authService.login as jest.Mock).mockResolvedValue({
        success: true,
        user: mockUser,
        token: 'token',
      });
      (settingsApi.getSettings as jest.Mock).mockResolvedValue(mockUserSettings);

      const TestComponent = () => {
        const { login, isAuthenticated } = useAuth();
        return (
          <div>
            <button onClick={() => login({ email: 'test@example.com', password: 'Pass123' })} data-testid="login-btn">
              Login
            </button>
            <div data-testid="auth-status">{isAuthenticated.toString()}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
      });

      await act(async () => {
        screen.getByTestId('login-btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('true');
      });
    });

    it('should return false when user is not logged in', async () => {
      const TestComponent = () => {
        const { isAuthenticated } = useAuth();
        return <div data-testid="auth-status">{isAuthenticated.toString()}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('false');
      });
    });
  });
});
