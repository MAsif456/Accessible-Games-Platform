import { useEffect, useState } from 'react';
import type { ReviewDto } from '../services/api';
import type { AdminReviewReport, AdminResolvedReviewReport } from '../services/adminReviewsService';
import {
  getAdminReviews,
  getAdminReportedReviews,
  getAdminResolvedReviewReports,
} from '../services/adminReviewsService';

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

  const load = (override?: { page?: number; search?: string }) => {
    const nextPage = override?.page ?? page;
    const nextSearch = override?.search ?? effectiveSearch;
    const nextRequest = requestId + 1;
    setRequestId(nextRequest);
    setLoading(true);
    setError(null);
    fetcher({ page: nextPage, pageSize, search: nextSearch || undefined })
      .then(res => {
        if (nextRequest !== requestId + 1) return;
        const safeItems = Array.isArray(res.items) ? res.items : [];
        setItems(safeItems);
        setTotal(typeof res.total === 'number' ? res.total : safeItems.length);
      })
      .catch(err => {
        console.error('Failed to load admin table', err);
        setError('Unable to load data. Please try again later.');
      })
      .finally(() => {
        if (nextRequest === requestId + 1) setLoading(false);
      });
  };

  useEffect(() => {
    load({ page: 1 });
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    load({ page: 1, search: effectiveSearch });
  }, [effectiveSearch]);

  const refresh = () => {
    load();
  };

  return {
    items,
    loading,
    error,
    searchTerm,
    page,
    pageSize,
    total,
    setSearchTerm,
    setPage: (p: number) => {
      setPage(p);
      load({ page: p });
    },
    refresh,
  };
}

export function useReviewsTable(pageSize = 7): UseTableState<ReviewDto> {
  return usePaginatedSearchTable<ReviewDto>(getAdminReviews, pageSize);
}

export function useReportedReviewsTable(pageSize = 7): UseTableState<AdminReviewReport> {
  return usePaginatedSearchTable<AdminReviewReport>(getAdminReportedReviews, pageSize);
}

export function useResolvedReportedReviewsTable(pageSize = 7): UseTableState<AdminResolvedReviewReport> {
  return usePaginatedSearchTable<AdminResolvedReviewReport>(getAdminResolvedReviewReports, pageSize);
}
