/**
 * Authentication Service
 *
 * @module authService
 * @description
 * Provides a unified interface for all authentication-related API calls from the frontend.
 * Handles JWT token and user data storage in localStorage for session persistence.
 * All state-changing requests include automatic CSRF protection via apiHelper utilities.
 *
 * **Features:**
 * - User registration and login
 * - Session management with localStorage
 * - Profile updates (name, bio, email, password)
 * - Automatic CSRF token handling
 * - JWT token management
 *
 * **Security:**
 * - Tokens stored in localStorage (consider httpOnly cookies for production)
 * - CSRF protection on all POST/PUT requests
 * - Password validation on client side
 */
import { apiPost, apiPut } from '../utils/apiHelper';

const API_URL = '/api';

/**
 * User signup data structure.
 * @interface SignupData
 * @property {string} fullName - User's full name
 * @property {string} email - Valid email address
 * @property {string} password - Password (min 8 chars, must contain number)
 * @property {string} confirmPassword - Password confirmation (must match password)
 */
export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * User login data structure.
 * @interface LoginData
 * @property {string} email - User's email address
 * @property {string} password - User's password
 */
export interface LoginData {
  email: string;
  password: string;
}

/**
 * Authentication API response structure.
 * @interface AuthResponse
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} message - Response message
 * @property {string} [token] - JWT token (if login/signup successful)
 * @property {Object} [user] - User object (if authenticated)
 */
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

/**
 * Authentication service class providing all auth-related operations.
 * @class AuthService
 */
class AuthService {
  /**
   * Registers a new user account.
   *
   * @param {SignupData} data - User registration data
   * @returns {Promise<AuthResponse>} Registration response with token and user
   *
   * @description
   * Creates a new user account and automatically logs them in by storing
   * the JWT token and user data in localStorage.
   *
   * **Process:**
   * 1. Sends POST request to /api/auth/signup
   * 2. Receives JWT token and user data
   * 3. Stores token and user in localStorage
   * 4. Returns response
   *
   * **Security:**
   * - CSRF protection applied automatically via apiPost
   * - Password validation performed on server
   * - Duplicate email check on server
   *
   * **Error Handling:**
   * - Returns success: false with error message
   * - Common errors: email already exists, weak password
   *
   * @example
   * const result = await authService.signup({
   *   fullName: 'John Doe',
   *   email: 'john@example.com',
   *   password: 'SecurePass123',
   *   confirmPassword: 'SecurePass123'
   * });
   */
  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await apiPost(`${API_URL}/auth/signup`, data);
    const result = await response.json();

    if (result.token) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }

    return result as AuthResponse;
  }

  /**
   * Authenticates a user with email and password.
   *
   * @param {LoginData} data - User login credentials
   * @returns {Promise<AuthResponse>} Login response with token and user
   *
   * @description
   * Authenticates user credentials and establishes a session by storing
   * the JWT token and user data in localStorage.
   *
   * **Process:**
   * 1. Sends POST request to /api/auth/login
   * 2. Receives JWT token and user data
   * 3. Stores token and user in localStorage
   * 4. Returns response
   *
   * **Security:**
   * - CSRF protection applied automatically
   * - Password transmitted over HTTPS
   * - Rate limited to prevent brute force (5 attempts/15min)
   *
   * **Error Handling:**
   * - Returns success: false for invalid credentials
   * - Generic error message to prevent user enumeration
   *
   * @example
   * const result = await authService.login({
   *   email: 'john@example.com',
   *   password: 'SecurePass123'
   * });
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiPost(`${API_URL}/auth/login`, data);
    const result = await response.json();

    if (result.token) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }

    return result as AuthResponse;
  }

  /**
   * Logs out the current user.
   *
   * @returns {Promise<void>}
   *
   * @description
   * Ends the user session by:
   * 1. Sending logout request to blacklist the JWT token
   * 2. Removing token and user data from localStorage
   *
   * **Security:**
   * - CSRF protection applied
   * - Token is blacklisted on server to prevent reuse
   * - localStorage cleared even if API call fails
   *
   * **Error Handling:**
   * - Errors are logged but don't prevent logout
   * - localStorage always cleared for security
   *
   * @example
   * await authService.logout();
   */
  async logout(): Promise<void> {
    const token = localStorage.getItem('token');

    if (token) {
      try {
        await apiPost(`${API_URL}/auth/logout`, undefined, {
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

  /**
   * Fetches the current user's profile from the server.
   *
   * @returns {Promise<AuthResponse>} User profile data
   * @throws {Error} If no token is found in localStorage
   *
   * @description
   * Validates the current session by fetching fresh user data from the server.
   * Used by AuthContext to verify token validity on app initialization.
   *
   * **Use Cases:**
   * - Verify token validity on page refresh
   * - Sync user data after profile updates
   * - Check authentication status
   *
   * **Security:**
   * - Requires valid JWT token
   * - Token sent in Authorization header
   *
   * **Error Handling:**
   * - Throws if no token in localStorage
   * - Returns 401 if token is invalid/expired
   *
   * @example
   * try {
   *   const { user } = await authService.getCurrentUser();
   * } catch (error) {
   *   // Token invalid, redirect to login
   * }
   */
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

  /**
   * Checks if a user is currently logged in.
   *
   * @returns {boolean} True if token exists in localStorage
   *
   * @description
   * Quick check for authentication status based on token presence.
   * Does NOT validate token with server.
   *
   * **Note:** This only checks for token presence, not validity.
   * Use getCurrentUser() for server-side validation.
   *
   * @example
   * if (authService.isLoggedIn()) {
   *   // Show authenticated content
   * }
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * Retrieves stored user data from localStorage.
   *
   * @returns {Object | null} User object or null if not found
   *
   * @description
   * Gets cached user data for quick access without API call.
   * Data may be stale; use getCurrentUser() for fresh data.
   *
   * @example
   * const user = authService.getStoredUser();
   * console.log(user?.name);
   */
  getStoredUser(): AuthResponse['user'] | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Retrieves the stored JWT token.
   *
   * @returns {string | null} JWT token or null if not logged in
   *
   * @description
   * Gets the authentication token for making authenticated API requests.
   *
   * @example
   * const token = authService.getToken();
   * fetch('/api/protected', {
   *   headers: { Authorization: `Bearer ${token}` }
   * });
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Updates user profile (name and bio).
   *
   * @param {Object} data - Profile update data
   * @param {string} [data.name] - New display name
   * @param {string} [data.bio] - New bio text
   * @returns {Promise<AuthResponse>} Update response with updated user
   *
   * @description
   * Updates the user's display name and/or bio. Automatically syncs
   * updated user data with localStorage cache.
   *
   * **Validation:**
   * - Name is trimmed and must be non-empty
   * - Bio can be empty string
   *
   * **State Management:**
   * - Updates localStorage on success
   * - AuthContext should be updated by calling component
   *
   * **Security:**
   * - CSRF protection via apiPut
   * - Requires valid JWT token
   *
   * @example
   * const result = await authService.updateProfile({
   *   name: 'New Name',
   *   bio: 'Updated bio text'
   * });
   */
  async updateProfile(data: { name?: string; bio?: string }): Promise<AuthResponse> {
    const token = this.getToken();
    const response = await apiPut(`${API_URL}/auth/profile`, data, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const result = await response.json();
    if (result.success && result.user) {
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    return result as AuthResponse;
  }

  /**
   * Updates account credentials (email and/or password).
   *
   * @param {Object} data - Account update data
   * @param {string} [data.newEmail] - New email address
   * @param {string} [data.currentPassword] - Current password (required for password change)
   * @param {string} [data.newPassword] - New password
   * @returns {Promise<AuthResponse>} Update response
   *
   * @description
   * Updates email address and/or password with validation and security checks.
   *
   * **Email Change Validation:**
   * - Must be valid email format
   * - Must not be already in use
   * - Different from current email
   *
   * **Password Change Validation:**
   * - Requires current password verification
   * - New password: min 8 chars, must contain number
   * - Password hashed on server
   *
   * **State Management:**
   * - Updates localStorage with new email
   * - Token remains valid after email change
   *
   * **Security:**
   * - CSRF protection via apiPut
   * - Current password required for changes
   * - Rate limited to prevent brute force
   *
   * **Error Handling:**
   * - Returns specific error messages:
   *   - 'Email already in use'
   *   - 'Current password incorrect'
   *   - 'Password too weak'
   *
   * @example
   * // Change email
   * await authService.updateAccount({
   *   newEmail: 'newemail@example.com'
   * });
   *
   * @example
   * // Change password
   * await authService.updateAccount({
   *   currentPassword: 'OldPass123',
   *   newPassword: 'NewPass456'
   * });
   */
  async updateAccount(data: { newEmail?: string; currentPassword?: string; newPassword?: string }): Promise<AuthResponse> {
    const token = this.getToken();
    const response = await apiPut(`${API_URL}/auth/account`, data, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const result = await response.json();
    if (result.success && result.user) {
      localStorage.setItem('user', JSON.stringify(result.user));
    }
    return result as AuthResponse;
  }
}

export default new AuthService();