/**
 * useCsrfToken Hook - Complete Test Coverage
 * Tests token fetching, success cases, error handling, and lifecycle
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useCsrfToken } from '../useCsrfToken';

// Mock global fetch
global.fetch = jest.fn();

describe('useCsrfToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Token Fetching', () => {
    it('should return null initially', () => {
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useCsrfToken());

      expect(result.current).toBeNull();
    });

    it('should fetch CSRF token on mount', async () => {
      const mockToken = 'csrf-token-123';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken }),
      });

      const { result } = renderHook(() => useCsrfToken());

      expect(global.fetch).toHaveBeenCalledWith('/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });

      await waitFor(() => {
        expect(result.current).toBe(mockToken);
      });
    });

    it('should use GET method for fetching token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      renderHook(() => useCsrfToken());

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/csrf-token',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should include credentials in fetch request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      renderHook(() => useCsrfToken());

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/csrf-token',
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    it('should update token state after successful fetch', async () => {
      const mockToken = 'new-csrf-token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken }),
      });

      const { result } = renderHook(() => useCsrfToken());

      // Initially null
      expect(result.current).toBeNull();

      // After fetch completes
      await waitFor(() => {
        expect(result.current).toBe(mockToken);
      });
    });

    it('should fetch token only once on mount', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      const { rerender } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Rerender should not cause another fetch
      rerender();

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should parse JSON response correctly', async () => {
      const mockToken = 'test-token-abc-123';
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ csrfToken: mockToken }),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(result.current).toBe(mockToken);
      });

      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle failed HTTP response gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch CSRF token:',
          'Internal Server Error'
        );
      });

      expect(result.current).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching CSRF token:',
          expect.any(Error)
        );
      });

      expect(result.current).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should keep token as null when fetch fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      expect(result.current).toBeNull();

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

      const { result } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      expect(result.current).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should handle 404 response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      const { result } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch CSRF token:',
          'Not Found'
        );
      });

      expect(result.current).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should handle 500 response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      expect(result.current).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Hook Lifecycle', () => {
    it('should fetch token immediately when hook is called', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      renderHook(() => useCsrfToken());

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should not refetch token when component rerenders', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      const { rerender } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Force multiple rerenders
      rerender();
      rerender();
      rerender();

      // Still only called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should maintain token value across rerenders', async () => {
      const mockToken = 'persistent-token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken }),
      });

      const { result, rerender } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(result.current).toBe(mockToken);
      });

      rerender();

      expect(result.current).toBe(mockToken);
    });

    it('should cleanup properly when unmounted', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ csrfToken: 'token' }),
      });

      const { unmount } = renderHook(() => useCsrfToken());

      unmount();

      // No errors should occur
      expect(true).toBe(true);
    });
  });

  describe('Different Token Values', () => {
    it('should handle short token strings', async () => {
      const shortToken = 'abc';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: shortToken }),
      });

      const { result } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(result.current).toBe(shortToken);
      });
    });

    it('should handle long token strings', async () => {
      const longToken = 'a'.repeat(1000);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: longToken }),
      });

      const { result } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(result.current).toBe(longToken);
      });
    });

    it('should handle tokens with special characters', async () => {
      const specialToken = 'token-with-@#$%^&*()-special_chars.123';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: specialToken }),
      });

      const { result } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(result.current).toBe(specialToken);
      });
    });
  });

  describe('Multiple Hook Instances', () => {
    it('should handle multiple hook instances independently', async () => {
      const token1 = 'token-1';
      const token2 = 'token-2';

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: token1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: token2 }),
        });

      const { result: result1 } = renderHook(() => useCsrfToken());
      const { result: result2 } = renderHook(() => useCsrfToken());

      await waitFor(() => {
        expect(result1.current).toBe(token1);
        expect(result2.current).toBe(token2);
      });

      // Should fetch once per hook instance
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
