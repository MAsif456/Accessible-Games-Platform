/**
 * Report API Service
 * Provides functions for submitting user reports (general, game, or review).
 * @module reportApi
 */
import { apiPost, apiGet } from '../utils/apiHelper';
import { getAuthHeaders } from './api';

/** The type of report being submitted */
export type ReportType = 'general' | 'game' | 'review';

/**
 * Payload structure for submitting a report.
 * @interface SubmitReportPayload
 */
export interface SubmitReportPayload {
  /** Type of report: general, game, or review */
  type: ReportType;
  /** The report description/content */
  description?: string;
  /** Voice transcript if submitted via voice input */
  transcript?: string;
  /** Optional categorisation of the issue (primarily for game reports) */
  issueType?: string;
  /** ID of the game being reported (for game reports) */
  gameId?: string;
  /** ID of the review being reported (for review reports) */
  reviewId?: string;
  /** Email address of the reporter */
  reporterEmail?: string;
  /** Display name of the reporter */
  reporterName?: string;
  /** User ID of the reporter if authenticated */
  reporterId?: string;
}

/**
 * Response structure from the submit report endpoint.
 * @interface SubmitReportResponse
 */
export interface SubmitReportResponse {
  /** Whether the submission was successful */
  success: boolean;
  /** Status message from the server */
  message: string;
}


export interface Report {
  /** Unique identifier for the report */
  id: string;
  /** Human-readable report code */
  reportCode: string;
  /** Type of report */
  type: ReportType;
  /** Report description/content */
  description: string;
  /** Voice transcript if available */
  transcript?: string;
  /** Issue type for game reports */
  issueType?: string;
  /** Current status */
  status: 'open' | 'resolved';
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when resolved (if resolved) */
  resolvedAt: string | null;
  /** Array of admin replies */
  adminReplies: Array<{
    message: string;
    adminName: string;
    createdAt: string;
  }>;
  /** Game ID if applicable */
  gameId: string | null;
  /** Review ID if applicable */
  reviewId: string | null;
}

/**
 * Response structure from the get report endpoint.
 * @interface GetReportResponse
 */
export interface GetReportResponse {
  success: boolean;
  report: Report;
}


/**
 * Submits a report to the server.
 * @param {SubmitReportPayload} payload - The report data to submit
 * @returns {Promise<SubmitReportResponse>} The server response
 * @throws {Error} If the API request fails
 */
export async function submitReport(payload: SubmitReportPayload): Promise<SubmitReportResponse> {
  const response = await apiPost('/api/reports', payload);

  if (!response.ok) {
    throw new Error('Failed to submit report');
  }

  return response.json();
}

/**
 * Fetches a user's own report by ID.
 * @param {string} reportId - The report ID
 * @returns {Promise<Report>} The report data including admin replies
 * @throws {Error} If the API request fails
 */
export async function getReportById(reportId: string): Promise<Report> {
  const response = await apiGet(`/api/reports/${encodeURIComponent(reportId)}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch report');
  }

  const data: GetReportResponse = await response.json();
  return data.report;
}
