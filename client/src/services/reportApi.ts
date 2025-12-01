/**
 * Report API Service
 * Provides functions for submitting user reports (general, game, or review).
 * @module reportApi
 */
import { apiPost } from '../utils/apiHelper';

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
