// authService.ts
// Provides a unified interface for authentication-related API calls from the frontend.
// Handles token and user data storage in localStorage for session persistence.
// All methods return JSON responses for consistency with backend API.
const API_URL = '/api';

export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'guest' | 'user' | 'admin';
    bio?: string;
    favourites?: string[];
    recentlyViewed?: string[];
    accessibilitySettings?: {
      highContrast?: boolean;
      screenReader?: boolean;
      keyboardNavigation?: boolean;
      voiceControl?: boolean;
    };
  };
}

class AuthService {
  // Registers a new user and stores the token for session management.
  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.token) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }

    return result as AuthResponse;
  }

  // Logs in a user and stores the token for session management.
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.token) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }

    return result as AuthResponse;
  }

  // Logs out the user by removing session data from localStorage.
  async logout(): Promise<void> {
    const token = localStorage.getItem('token');

    if (token) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Fetches the current user's profile using the stored token.
  async getCurrentUser(): Promise<AuthResponse> {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.json();
  }

  // Checks if a user is currently logged in by verifying the presence of a token.
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // Retrieves stored user data from localStorage for quick access.
  getStoredUser(): AuthResponse['user'] | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Retrieves the stored authentication token from localStorage.
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Updates the user's profile and keeps localStorage in sync.
  async updateProfile(data: { name?: string; bio?: string }): Promise<AuthResponse> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success && result.user) {
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    return result as AuthResponse;
  }

  // Updates account details such as email and/or password.
  async updateAccount(data: { newEmail?: string; currentPassword?: string; newPassword?: string }): Promise<AuthResponse> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/auth/account`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.success && result.user) {
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    return result as AuthResponse;
  }
}

export default new AuthService();