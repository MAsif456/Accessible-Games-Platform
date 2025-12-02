/**
 * API Helper Utilities
 *
 * Provides global fetch wrappers that automatically include CSRF tokens.
 * All POST, PUT, PATCH, DELETE requests are protected automatically.
 *
 * Benefits:
 * - Automatic CSRF protection for all state-changing requests
 * - Consistent error handling
 * - Centralized request configuration
 * - Future-proof: New endpoints get CSRF automatically
 *
 * @module utils/apiHelper
 */

/**
 * Get CSRF token from cookies
 * The token is stored in a cookie by the server when /api/csrf-token is called
 */
const getCsrfTokenFromCookie = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'x-csrf-token') {
      return decodeURIComponent(value);
    }
  }
  return null;
};

/**
 * Fetch CSRF token from server
 * This should be called once when the app loads
 */
let cachedCsrfToken: string | null = null;

export const fetchCsrfToken = async (): Promise<string | null> => {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      cachedCsrfToken = data.csrfToken;
      return cachedCsrfToken;
    }
  } catch (error) {
    console.error('[API Helper] Failed to fetch CSRF token:', error);
  }

  return null;
};

/**
 * Enhanced fetch wrapper with automatic CSRF token inclusion
 *
 * Usage:
 * ```typescript
 * // Instead of fetch()
 * const response = await apiFetch('/api/games', {
 *   method: 'POST',
 *   body: JSON.stringify(gameData),
 * });
 * ```
 *
 * @param url - API endpoint URL
 * @param options - Fetch options
 * @returns Promise with Response object
 */
export const apiFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const { method = 'GET', headers = {}, ...restOptions } = options;

  // Prepare headers as a mutable record so we can safely assign custom keys
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    const csrfToken = getCsrfTokenFromCookie() || cachedCsrfToken || (await fetchCsrfToken());

    if (csrfToken) {
      requestHeaders['x-csrf-token'] = csrfToken;
    } else {
      console.warn('[API Helper] CSRF token not available for request:', url);
    }
  }

  // Make the request
  return fetch(url, {
    method,
    headers: requestHeaders,
    credentials: 'include', // Always include cookies
    ...restOptions,
  });
};

/**
 * Helper for GET requests (no CSRF needed)
 */
export const apiGet = async (url: string, options: RequestInit = {}): Promise<Response> => {
  return apiFetch(url, { ...options, method: 'GET' });
};

/**
 * Helper for POST requests (CSRF protected)
 */
export const apiPost = async (
  url: string,
  data?: any,
  options: RequestInit = {}
): Promise<Response> => {
  return apiFetch(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
};

/**
 * Helper for PUT requests (CSRF protected)
 */
export const apiPut = async (
  url: string,
  data?: any,
  options: RequestInit = {}
): Promise<Response> => {
  return apiFetch(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
};

/**
 * Helper for PATCH requests (CSRF protected)
 */
export const apiPatch = async (
  url: string,
  data?: any,
  options: RequestInit = {}
): Promise<Response> => {
  return apiFetch(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
};

/**
 * Helper for DELETE requests (CSRF protected)
 */
export const apiDelete = async (url: string, options: RequestInit = {}): Promise<Response> => {
  return apiFetch(url, { ...options, method: 'DELETE' });
};

/**
 * Initialize CSRF token on app load
 * Call this in main.tsx or App.tsx
 */
export const initializeCsrf = async (): Promise<void> => {
  await fetchCsrfToken();
};
