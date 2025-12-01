/**
 * CSRF Token Hook
 *
 * Provides CSRF token for protecting state-changing requests (POST, PUT, DELETE).
 * The token is fetched once on mount and reused for all subsequent requests.
 *
 * WCAG 2.1 AA Compliance:
 * - CSRF protection is transparent to users and doesn't affect accessibility
 * - No additional user interaction required
 *
 * @module hooks/useCsrfToken
 */

import { useState, useEffect } from 'react';

/**
 * Custom hook to fetch and manage CSRF token
 *
 * Usage:
 * ```typescript
 * const csrfToken = useCsrfToken();
 *
 * // Use in fetch requests
 * fetch('/api/data', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'x-csrf-token': csrfToken || '',
 *   },
 *   credentials: 'include',
 *   body: JSON.stringify(data),
 * });
 * ```
 *
 * @returns CSRF token string or null if not yet loaded
 */
export const useCsrfToken = (): string | null => {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch CSRF token on component mount
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch('/api/csrf-token', {
          method: 'GET',
          credentials: 'include', // Include cookies
        });

        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.csrfToken);
        } else {
          console.error('Failed to fetch CSRF token:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      }
    };

    fetchCsrfToken();
  }, []); // Empty dependency array - fetch only once

  return csrfToken;
};
