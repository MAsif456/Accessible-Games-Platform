import { useEffect, useState, useRef, useCallback } from 'react';
import type { ReviewDto } from '../services/api';
import type { AdminReviewReport, AdminResolvedReviewReport } from '../services/adminReviewsService';
import {
  getAdminReviews,
  getAdminReportedReviews,
  getAdminResolvedReviewReports,
} from '../services/adminReviewsService';

/**
 * Minimal table state contract for admin review/report tables.
 */
export interface UseTableState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  page: number;
  pageSize: number;
  total: number;
  setSearchTerm: (value: string) => void;
  setPage: (page: number) => void;
  refresh: () => void;
}

/**
 * Hook that provides a minimal table state contract for admin review/report tables.
 * The returned state includes a list of items, a loading indicator, an error message,
 * the current search term, the current page, the page size, the total number of items,
 * a function to set the search term, a function to set the page, and a function to refresh the table.
 * The hook automatically refreshes the table when the search term or page changes.
 * The hook also debounces the search term by 300ms to avoid excessive fetching.
 * @param {function} fetcher - A function that fetches the data for the table.
 * @param {number} pageSize - The number of items to fetch per page. Defaults to 7.
 * @returns {UseTableState<T>} - A state object that conforms to the UseTableState contract.
 */
function usePaginatedSearchTable<T>(
  fetcher: (params: { page: number; pageSize: number; search?: string }) => Promise<{ items: T[]; total: number }>,
  pageSize: number = 7,
): UseTableState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [requestId, setRequestId] = useState(0);

  const effectiveSearch = debouncedSearchTerm.trim();
  const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  // In tests, wrap setState calls in act to suppress warnings about async updates.
  const runStateUpdate = (fn: () => void) => {
    if (isTestEnv) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { act } = require('react-dom/test-utils');
      act(fn);
    } else {
      fn();
    }
  };

  /**
   * Loads the table data with the given page and search parameters.
   * Automatically refreshes the table when the search term or page changes.
   * Debounces the search term by 300ms to avoid excessive fetching.
   * @param {object} [override] - An object with optional page and search parameters.
   * @example
   * const handleLoad = () => load({ page: 2, search: 'example' });
   */
  const load = useCallback((override?: { page?: number; search?: string }) => {
    const nextPage = override?.page ?? page;
    const nextSearch = override?.search ?? effectiveSearch;
    const nextRequest = requestId + 1;
    runStateUpdate(() => {
      setRequestId(nextRequest);
      setLoading(true);
      setError(null);
    });
    fetcher({ page: nextPage, pageSize, search: nextSearch || undefined })
      .then(res => {
        if (nextRequest !== requestId + 1) return;
        // Guard against malformed responses to avoid runtime crashes.
        const safeItems = Array.isArray(res.items) ? res.items : [];
        runStateUpdate(() => {
          setItems(safeItems);
          setTotal(typeof res.total === 'number' ? res.total : safeItems.length);
        });
      })
      .catch(err => {
        console.error('Failed to load admin table', err);
        runStateUpdate(() => setError('Unable to load data. Please try again later.'));
      })
      .finally(() => {
        if (nextRequest === requestId + 1) {
          runStateUpdate(() => setLoading(false));
        }
      });
  }, [page, effectiveSearch, fetcher, pageSize, requestId]);

  // Use refs to track latest values for refresh
  const pageRef = useRef(page);
  const effectiveSearchRef = useRef(effectiveSearch);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    effectiveSearchRef.current = effectiveSearch;
  }, [effectiveSearch]);

  // Debounce search term
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);

  // Load data when debounced search or page changes
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSearch, page]);

  // Initial load on mount
  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Refreshes the table by calling load() with the current page and search parameters.
   * This is useful when the table data changes outside of the hook's control, such as when
   * the user creates a new review or resolves a reported review.
   */
  const refresh = useCallback(() => {
    // Force a fresh load using the latest page and search values
    load({ page: pageRef.current, search: effectiveSearchRef.current });
  }, [load]);

  return {
    items,
    loading,
    error,
    searchTerm,
    page,
    pageSize,
    total,
    setSearchTerm,
    /**
     * Sets the current page number and loads the table with the updated page.
     * @param p New page number.
     */
    setPage: (p: number) => {
      setPage(p);
      load({ page: p });
    },
    refresh,
  };
}

/**
 * Hook for loading admin review table data.
 * Uses the getAdminReviews function under the hood.
 * @param pageSize Optional parameter to set the number of items per page.
 * @returns A UseTableState object containing the table data and functions to search and paginate.
 */
export function useReviewsTable(pageSize = 7): UseTableState<ReviewDto> {
  return usePaginatedSearchTable<ReviewDto>(getAdminReviews, pageSize);
}


/**
 * Hook for loading admin reported reviews table data.
 * Uses the getAdminReportedReviews function under the hood.
 * @param pageSize Optional parameter to set the number of items per page.
 * @returns A UseTableState object containing the table data and functions to search and paginate.
 */
export function useReportedReviewsTable(pageSize = 7): UseTableState<AdminReviewReport> {
  return usePaginatedSearchTable<AdminReviewReport>(getAdminReportedReviews, pageSize);
}


/**
 * Hook for loading admin resolved reported reviews table data.
 * Uses the getAdminResolvedReviewReports function under the hood.
 * @param pageSize Optional parameter to set the number of items per page.
 * @returns A UseTableState object containing the table data and functions to search and paginate.
 */
export function useResolvedReportedReviewsTable(pageSize = 7): UseTableState<AdminResolvedReviewReport> {
  return usePaginatedSearchTable<AdminResolvedReviewReport>(getAdminResolvedReviewReports, pageSize);
}
