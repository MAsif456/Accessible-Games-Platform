/**
 * CSRF Context Provider
 *
 * Provides CSRF token to all components in the application.
 * This enables global CSRF protection for all state-changing requests.
 *
 * Benefits:
 * - Single fetch: Token fetched once when app loads
 * - Global access: Any component can access the token
 * - Automatic protection: New features get CSRF automatically
 *
 * WCAG 2.1 AA Compliance:
 * - Transparent security - no impact on accessibility
 * - No additional user interaction required
 *
 * @module context/CsrfContext
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface CsrfContextType {
  csrfToken: string | null;
  isLoading: boolean;
}

const CsrfContext = createContext<CsrfContextType | undefined>(undefined);

interface CsrfProviderProps {
  children: ReactNode;
}

/**
 * CSRF Provider Component
 *
 * Wraps the entire application to provide CSRF token to all components.
 *
 * Usage in main.tsx or App.tsx:
 * ```typescript
 * <CsrfProvider>
 *   <App />
 * </CsrfProvider>
 * ```
 */
export const CsrfProvider: React.FC<CsrfProviderProps> = ({ children }) => {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch('/api/csrf-token', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.csrfToken);
        } else {
          console.error('[CSRF] Failed to fetch token:', response.statusText);
        }
      } catch (error) {
        console.error('[CSRF] Error fetching token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCsrfToken();
  }, []);

  return (
    <CsrfContext.Provider value={{ csrfToken, isLoading }}>
      {children}
    </CsrfContext.Provider>
  );
};

/**
 * Hook to access CSRF token from any component
 *
 * Usage:
 * ```typescript
 * const { csrfToken, isLoading } = useCsrf();
 *
 * if (!csrfToken) return <div>Loading...</div>;
 *
 * // Use token in requests
 * fetch('/api/data', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'x-csrf-token': csrfToken,
 *   },
 *   credentials: 'include',
 *   body: JSON.stringify(data),
 * });
 * ```
 *
 * @throws Error if used outside CsrfProvider
 */
export const useCsrf = (): CsrfContextType => {
  const context = useContext(CsrfContext);
  if (context === undefined) {
    throw new Error('useCsrf must be used within a CsrfProvider');
  }
  return context;
};
