/**
 * CsrfContext - Complete Test Coverage
 * Tests provider, hook, token fetching, loading states, and error handling
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CsrfProvider, useCsrf } from '../CsrfContext';

// Mock global fetch
global.fetch = jest.fn();

describe('CsrfContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Provider and Hook', () => {
    it('should throw error when useCsrf is used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        useCsrf();
        return <div>Test</div>;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'useCsrf must be used within a CsrfProvider'
      );

      consoleError.mockRestore();
    });

    it('should provide context value to children', async () => {
      const mockCsrfToken = 'test-csrf-token-123';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockCsrfToken }),
      });

      const TestComponent = () => {
        const { csrfToken, isLoading } = useCsrf();
        return (
          <div>
            <div data-testid="csrf-token">{csrfToken || 'null'}</div>
            <div data-testid="is-loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <CsrfProvider>
          <TestComponent />
        </CsrfProvider>
      );

      // Initially loading should be true
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');

      // Wait for token to be fetched
      await waitFor(() => {
        expect(screen.getByTestId('csrf-token')).toHaveTextContent(mockCsrfToken);
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });

    it('should initialize with null token and loading true', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      const TestComponent = () => {
        const { csrfToken, isLoading } = useCsrf();
        return (
          <div>
            <div data-testid="initial-token">{csrfToken === null ? 'null' : csrfToken}</div>
            <div data-testid="initial-loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <CsrfProvider>
          <TestComponent />
        </CsrfProvider>
      );

      expect(screen.getByTestId('initial-token')).toHaveTextContent('null');
      expect(screen.getByTestId('initial-loading')).toHaveTextContent('true');
    });
  });

  describe('Token Fetching', () => {
    it('should fetch CSRF token successfully', async () => {
      const mockCsrfToken = 'csrf-token-abc-123';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockCsrfToken }),
      });

      const TestComponent = () => {
        const { csrfToken, isLoading } = useCsrf();
        return (
          <div>
            <div data-testid="token">{csrfToken || 'loading'}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <CsrfProvider>
          <TestComponent />
        </CsrfProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('token')).toHaveTextContent(mockCsrfToken);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });
    });

    it('should set loading to false after successful fetch', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-token' }),
      });

      const TestComponent = () => {
        const { isLoading } = useCsrf();
        return <div data-testid="loading-state">{isLoading.toString()}</div>;
      };

      render(
        <CsrfProvider>
          <TestComponent />
        </CsrfProvider>
      );

      // Initially loading
      expect(screen.getByTestId('loading-state')).toHaveTextContent('true');

      // After fetch completes
      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
      });
    });

    it('should include credentials in fetch request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      render(
        <CsrfProvider>
          <div>Test</div>
        </CsrfProvider>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/csrf-token',
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });

    it('should use GET method for fetching token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      render(
        <CsrfProvider>
          <div>Test</div>
        </CsrfProvider>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/csrf-token',
          expect.objectContaining({
            method: 'GET',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle failed HTTP response gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const TestComponent = () => {
        const { csrfToken, isLoading } = useCsrf();
        return (
          <div>
            <div data-testid="token">{csrfToken === null ? 'null' : csrfToken}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <CsrfProvider>
          <TestComponent />
        </CsrfProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CSRF] Failed to fetch token:',
        'Internal Server Error'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const TestComponent = () => {
        const { csrfToken, isLoading } = useCsrf();
        return (
          <div>
            <div data-testid="token">{csrfToken === null ? 'null' : csrfToken}</div>
            <div data-testid="loading">{isLoading.toString()}</div>
          </div>
        );
      };

      render(
        <CsrfProvider>
          <TestComponent />
        </CsrfProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CSRF] Error fetching token:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should set loading to false even when fetch fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch failed'));

      const TestComponent = () => {
        const { isLoading } = useCsrf();
        return <div data-testid="loading-state">{isLoading.toString()}</div>;
      };

      render(
        <CsrfProvider>
          <TestComponent />
        </CsrfProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle JSON parsing errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const TestComponent = () => {
        const { csrfToken } = useCsrf();
        return <div data-testid="token">{csrfToken === null ? 'null' : csrfToken}</div>;
      };

      render(
        <CsrfProvider>
          <TestComponent />
        </CsrfProvider>
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      expect(screen.getByTestId('token')).toHaveTextContent('null');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Multiple Children', () => {
    it('should provide same context to multiple children', async () => {
      const mockCsrfToken = 'shared-csrf-token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockCsrfToken }),
      });

      const ChildOne = () => {
        const { csrfToken } = useCsrf();
        return <div data-testid="child-one">{csrfToken || 'loading'}</div>;
      };

      const ChildTwo = () => {
        const { csrfToken } = useCsrf();
        return <div data-testid="child-two">{csrfToken || 'loading'}</div>;
      };

      render(
        <CsrfProvider>
          <ChildOne />
          <ChildTwo />
        </CsrfProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child-one')).toHaveTextContent(mockCsrfToken);
        expect(screen.getByTestId('child-two')).toHaveTextContent(mockCsrfToken);
      });

      // Should only fetch once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should provide same loading state to multiple children', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      const ChildOne = () => {
        const { isLoading } = useCsrf();
        return <div data-testid="loading-one">{isLoading.toString()}</div>;
      };

      const ChildTwo = () => {
        const { isLoading } = useCsrf();
        return <div data-testid="loading-two">{isLoading.toString()}</div>;
      };

      render(
        <CsrfProvider>
          <ChildOne />
          <ChildTwo />
        </CsrfProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-one')).toHaveTextContent('false');
        expect(screen.getByTestId('loading-two')).toHaveTextContent('false');
      });
    });
  });

  describe('Fetch on Mount', () => {
    it('should fetch token only once on mount', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      const { rerender } = render(
        <CsrfProvider>
          <div>Test</div>
        </CsrfProvider>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Rerender should not cause another fetch
      rerender(
        <CsrfProvider>
          <div>Test Updated</div>
        </CsrfProvider>
      );

      // Still only called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should fetch token immediately when provider mounts', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      render(
        <CsrfProvider>
          <div>Test</div>
        </CsrfProvider>
      );

      expect(global.fetch).toHaveBeenCalledWith('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });
    });
  });

  describe('Token State Management', () => {
    it('should update token state after successful fetch', async () => {
      const mockCsrfToken = 'new-csrf-token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockCsrfToken }),
      });

      const TestComponent = () => {
        const { csrfToken } = useCsrf();
        return <div data-testid="token-value">{csrfToken || 'null'}</div>;
      };

      render(
        <CsrfProvider>
          <TestComponent />
        </CsrfProvider>
      );

      // Initially null
      expect(screen.getByTestId('token-value')).toHaveTextContent('null');

      // After fetch
      await waitFor(() => {
        expect(screen.getByTestId('token-value')).toHaveTextContent(mockCsrfToken);
      });
    });

    it('should keep token as null when fetch fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

      const TestComponent = () => {
        const { csrfToken } = useCsrf();
        return <div data-testid="token-value">{csrfToken === null ? 'null' : csrfToken}</div>;
      };

      render(
        <CsrfProvider>
          <TestComponent />
        </CsrfProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('token-value')).toHaveTextContent('null');
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
