// AuthContext.tsx
// Provides authentication state and actions to the entire React application using Context API.
// Centralises user session management and ensures consistent authentication logic across all components.
// Uses localStorage for persistence and verifies tokens with the backend for security.
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { SignupData, LoginData, AuthResponse } from '../services/authService';
import settingsApi, { UserSettings } from '../services/settingsApi';
import { applyAccessibilityPreferences } from '../utils/accessibility';
import { UserRole } from '../components/ui/Navbar';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  bio?: string;
  favourites?: string[];
  recentlyViewed?: string[];
  accessibilitySettings?: {
    highContrast?: boolean;
    screenReader?: boolean;
    keyboardNavigation?: boolean;
    voiceControl?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signup: (data: SignupData) => Promise<AuthResponse>;
  login: (data: LoginData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  userSettings: UserSettings | null;
  refreshUserSettings: () => Promise<void>;
  updateUserSettingsState: (settings: UserSettings | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook for accessing authentication context. Throws if used outside AuthProvider.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// The AuthProvider wraps the app and supplies authentication state and actions.
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  const loadUserSettings = async (userId: string) => {
    try {
      const loaded = await settingsApi.getSettings(userId);
      if (loaded) {
        setUserSettings(loaded);
        applyAccessibilityPreferences(loaded);
      }
    } catch (error) {
      console.error('Failed to load accessibility settings:', error);
    }
  };

/**
 * Refreshes the user's accessibility settings by re-fetching them from the
 * server. Does nothing if the user is not logged in.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
  const refreshUserSettings = async () => {
    if (user?.id) {
      await loadUserSettings(user.id);
    }
  };

/**
 * Updates the user's accessibility settings by re-setting the state and
 * re-applying accessibility preferences based on the new settings.
 * Does nothing if the settings are null.
 * @param {UserSettings | null} settings The new accessibility settings to apply, or null to disable accessibility settings.
 */
  const updateUserSettingsState = (settings: UserSettings | null) => {
    setUserSettings(settings);
    applyAccessibilityPreferences(settings);
  };

  useEffect(() => {
    /**
 * Initialises the authentication state by verifying the stored user's
 * token and fetching their accessibility settings. If the stored user
 * has a valid token, the current user is updated and their
 * accessibility settings are re-fetched from the server. If the
 * stored user has an invalid or expired token, they are logged out
 * and their accessibility settings are disabled. If no stored user is
 * found, the authentication state is left unchanged.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
    const initialiseAuth = async () => {
      try {
        const storedUser = authService.getStoredUser();
        const token = authService.getToken();

          if (storedUser && token) {
            // Verifies token validity by fetching current user from the backend.
            try {
              const response = await authService.getCurrentUser();
              if (response.success && response.user) {
                const currentUser = response.user as User;
                setUser(currentUser);
                await loadUserSettings(currentUser.id);
              } else {
                // Handles expired or invalid tokens by logging out.
                authService.logout();
                updateUserSettingsState(null);
              }
            } catch (error) {
              console.error('Token verification failed, falling back to stored user.', error);
              setUser(storedUser as User);
              updateUserSettingsState(null);
            }
          } else if (storedUser) {
            setUser(storedUser as User);
          }
      } catch (error) {
        console.error('Auth initialisation error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialiseAuth();
  }, []);


/**
 * Signs up a new user with the provided data.
 * If successful, the newly created user is set as the current user and
 * their accessibility settings are loaded.
 * @param {SignupData} data - Data to sign up a new user with.
 * @returns {Promise<AuthResponse>} A promise that resolves with an authentication response.
 * @throws {Error} If the signup fails.
 */
/*******  6a885aa0-90c3-40e7-baf1-1da1e8e332ae  *******/  const signup = async (data: SignupData): Promise<AuthResponse> => {
    try {
      const response = await authService.signup(data);
      if (response.success && response.user) {
        const newUser = response.user as User;
        setUser(newUser);
        await loadUserSettings(newUser.id);
      }
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Signup failed',
      };
    }
  };

/**
 * Logs in a user with the provided data.
 * If successful, the logged in user is set as the current user and
 * their accessibility settings are loaded.
 * @param {LoginData} data - Data to log in a user with.
 * @returns {Promise<AuthResponse>} A promise that resolves with an authentication response.
 * @throws {Error} If the login fails.
 */
  const login = async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await authService.login(data);
      if (response.success && response.user) {
        const loggedInUser = response.user as User;
        setUser(loggedInUser);
        await loadUserSettings(loggedInUser.id);
      }
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  };

/**
 * Logs out the current user and resets their accessibility settings.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 * @throws {Error} If the logout fails.
 */
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      setUser(null);
      updateUserSettingsState(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

/**
 * Updates the current user and their accessibility settings in local storage.
 * @param {User} updatedUser - The updated user to be stored.
 */
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signup,
    login,
    logout,
    updateUser,
    userSettings,
    refreshUserSettings,
    updateUserSettingsState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
