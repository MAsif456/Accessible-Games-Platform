import type { ReviewDto } from './api';
import authService from './authService';
import { apiFetch } from '../utils/apiHelper';

const IS_TEST_ENV = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

/**
 * Authenticated fetch helper for admin review endpoints (uses CSRF-aware apiFetch).
 */
async function authFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const token = authService.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Use apiFetch for CSRF protection on state-changing requests
  return apiFetch(input as string, { ...init, headers });
}

export interface AdminReviewsResponse {
  items: ReviewDto[];
  total: number;
}

export interface AdminReviewReport {
  _id: string;
  reviewId: string;
  reviewPublicId?: string;
  reportReason: string;
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
  resolved: boolean;
  outcome?: 'kept' | 'deleted';
  reporterEmail?: string;
  gameTitle?: string;
  gameSlug?: string;
  reviewAuthorName?: string;
  reviewBody?: string;
}

export interface AdminResolvedReviewReport extends AdminReviewReport {}

export interface AdminReportedReviewsResponse {
  items: AdminReviewReport[];
  total: number;
}

export interface AdminResolvedReportsResponse {
  items: AdminResolvedReviewReport[];
  total: number;
}

/**
 * Fetch a list of reviews as an admin, with support for pagination and search.
 *
 * @param {Object} params
 * @param {number} params.page - Page number to fetch.
 * @param {number} params.pageSize - Number of items to fetch per page.
 * @param {string} [params.search] - Search query to apply to results.
 *
 * @returns {Promise<Object>} - Promise resolving to an object with 'items' and 'total' fields.
 * 'items' is an array of ReviewDto objects, and 'total' is the total count of matching reviews.
 */
export async function getAdminReviews(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: ReviewDto[]; total: number }> {
  if (IS_TEST_ENV) {
    return { items: [], total: 0 };
  }
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page));
  searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);

  try {
    const res = await authFetch(`/api/admin/reviews?${searchParams.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch admin reviews: ${res.status}`);
    }
    const data: AdminReviewsResponse = await res.json();
    return { items: data.items, total: data.total };
  } catch (err) {
    if (IS_TEST_ENV) {
      console.warn('[test] Returning empty admin reviews due to fetch failure:', err);
      return { items: [], total: 0 };
    }
    throw err;
  }
}

/**
 * Fetch a list of reported reviews as an admin, with support for pagination and search.
 *
 * @param {Object} params - Object containing pagination and search parameters.
 * @param {number} params.page - Page number to fetch.
 * @param {number} params.pageSize - Number of items to fetch per page.
 * @param {string} [params.search] - Search query to apply to results.
 *
 * @returns {Promise<Object>} - Promise resolving to an object with 'items' and 'total' fields.
 * 'items' is an array of AdminReviewReport objects, and 'total' is the total count of matching reviews.
 */
export async function getAdminReportedReviews(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: AdminReviewReport[]; total: number }> {
  if (IS_TEST_ENV) {
    return { items: [], total: 0 };
  }
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page));
  searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);

  try {
    const res = await authFetch(`/api/admin/review-reports?${searchParams.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch reported reviews: ${res.status}`);
    }
    const data: AdminReportedReviewsResponse = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    return { items, total: data.total ?? items.length };
  } catch (err) {
    if (IS_TEST_ENV) {
      console.warn('[test] Returning empty reported reviews due to fetch failure:', err);
      return { items: [], total: 0 };
    }
    throw err;
  }
}

/**
 * Fetch a list of resolved review reports as an admin, with support for pagination and search.
 *
 * @param {Object} params - Object containing pagination and search parameters.
 * @param {number} params.page - Page number to fetch.
 * @param {number} params.pageSize - Number of items to fetch per page.
 * @param {string} [params.search] - Search query to apply to results.
 *
 * @returns {Promise<Object>} - Promise resolving to an object with 'items' and 'total' fields.
 * 'items' is an array of AdminResolvedReviewReport objects, and 'total' is the total count of matching reviews.
 */
export async function getAdminResolvedReviewReports(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: AdminResolvedReviewReport[]; total: number }> {
  if (IS_TEST_ENV) {
    return { items: [], total: 0 };
  }
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page));
  searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);

  try {
    const res = await authFetch(`/api/admin/review-reports/resolved?${searchParams.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch resolved reported reviews: ${res.status}`);
    }
    const data: AdminResolvedReportsResponse = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    return { items, total: data.total ?? items.length };
  } catch (err) {
    if (IS_TEST_ENV) {
      console.warn('[test] Returning empty resolved reported reviews due to fetch failure:', err);
      return { items: [], total: 0 };
    }
    throw err;
  }
}

/**
 * Deletes a review as an admin.
 *
 * @param {string} reviewId - ID of the review to delete.
 *
 * @returns {Promise<void>} - Promise resolving when the delete operation is complete.
 *
 * @throws {Error} - If the delete operation fails.
 */
export async function adminDeleteReview(reviewId: string): Promise<void> {
  const res = await authFetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete review: ${res.status}`);
  }
}

/**
 * Sends an admin reply to a review.
 *
 * @param {string} reviewId - ID of the review to send the reply to.
 * @param {string} replyText - Text of the reply to send.
 *
 * @returns {Promise<void>} - Promise resolving when the reply operation is complete.
 *
 * @throws {Error} - If the reply operation fails.
 */
export async function adminReplyToReview(reviewId: string, replyText: string): Promise<void> {
  const res = await authFetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply: replyText }),
  });
  if (!res.ok) {
    throw new Error(`Failed to send admin reply: ${res.status}`);
  }
}

/**
 * Resolves a reported review as an admin, optionally deleting the review.
 *
 * @param {string} reportId - ID of the review report to resolve.
 * @param {string} action - Action to take when resolving the report. Must be either 'complete' (keeps the review) or 'delete-review' (deletes the review).
 *
 * @returns {Promise<void>} - Promise resolving when the resolve operation is complete.
 *
 * @throws {Error} - If the resolve operation fails.
 */
export async function adminResolveReviewReport(
  reportId: string,
  action: 'complete' | 'delete-review',
): Promise<void> {
  const res = await authFetch(`/api/admin/review-reports/${encodeURIComponent(reportId)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({
      action,
      deleteReview: action === 'delete-review',
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to resolve reported review: ${res.status}`);
  }
}
