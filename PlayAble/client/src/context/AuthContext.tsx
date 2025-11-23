import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { SignupData, LoginData, AuthResponse } from '../services/authService';
import { UserRole } from '../components/ui/Navbar';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored user on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getStoredUser();
        const token = authService.getToken();

        if (storedUser && token) {
          // Verify token is still valid by fetching current user
          try {
            const response = await authService.getCurrentUser();
            if (response.success && response.user) {
              setUser(response.user as User);
            } else {
              // Token expired or invalid
              authService.logout();
            }
          } catch (error) {
            // Token verification failed
            authService.logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const signup = async (data: SignupData): Promise<AuthResponse> => {
    try {
      const response = await authService.signup(data);
      if (response.success && response.user) {
        setUser(response.user as User);
      }
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Signup failed',
      };
    }
  };

  const login = async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await authService.login(data);
      if (response.success && response.user) {
        setUser(response.user as User);
      }
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};