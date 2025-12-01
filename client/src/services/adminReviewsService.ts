import type { ReviewDto } from './api';
import authService from './authService';

async function authFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const token = authService.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(input, { ...init, headers });
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

export async function getAdminReviews(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: ReviewDto[]; total: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page));
  searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);

  const res = await authFetch(`/api/admin/reviews?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch admin reviews: ${res.status}`);
  }
  const data: AdminReviewsResponse = await res.json();
  return { items: data.items, total: data.total };
}

export async function getAdminReportedReviews(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: AdminReviewReport[]; total: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page));
  searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);

  const res = await authFetch(`/api/admin/review-reports?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch reported reviews: ${res.status}`);
  }
  const data: AdminReportedReviewsResponse = await res.json();
  return { items: data.items, total: data.total };
}

export async function getAdminResolvedReviewReports(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: AdminResolvedReviewReport[]; total: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page));
  searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);

  const res = await authFetch(`/api/admin/review-reports/resolved?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch resolved reported reviews: ${res.status}`);
  }
  const data: AdminResolvedReportsResponse = await res.json();
  return { items: data.items, total: data.total };
}

export async function adminDeleteReview(reviewId: string): Promise<void> {
  const res = await authFetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete review: ${res.status}`);
  }
}

export async function adminReplyToReview(reviewId: string, replyText: string): Promise<void> {
  const res = await authFetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply: replyText }),
  });
  if (!res.ok) {
    throw new Error(`Failed to send admin reply: ${res.status}`);
  }
}

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
