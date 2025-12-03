/**
 * Admin Reports Service
 * Provides API functions for managing general reports in the admin dashboard.
 * @module adminReportsService
 */
import { getAuthHeaders } from './api';
import { apiPost, apiGet } from '../utils/apiHelper';

/** Possible statuses for a general report */
export type GeneralReportStatus = 'open' | 'resolved';

/**
 * Represents a general report as returned by the admin API.
 * @interface AdminGeneralReport
 */
export interface AdminGeneralReport {
  /** Unique identifier for the report */
  id: string;
  /** Human-readable report code (e.g., GR123ABC) */
  reportCode: string;
  /** Description/content of the report */
  description: string;
  /** Current status of the report */
  status: GeneralReportStatus;
  /** Email address of the reporter, if available */
  reporterEmail: string | null;
  /** Display name of the reporter, if available */
  reporterName: string | null;
  /** User ID of the reporter, if authenticated */
  reporterId: string | null;
  /** ISO timestamp when the report was created */
  createdAt: string;
  /** ISO timestamp when the report was resolved, if applicable */
  resolvedAt: string | null;
  /** Array of admin replies to the report */
  adminReplies: Array<{
    /** The reply message content */
    message: string;
    /** Name of the admin who replied */
    adminName: string;
    /** ISO timestamp when the reply was created */
    createdAt: string;
  }>;
}

/**
 * Response structure from the reports list endpoint.
 * @interface ReportsResponse
 */
interface ReportsResponse {
  reports: AdminGeneralReport[];
}

/**
 * Response structure from the reply endpoint.
 * @interface ReplyResponse
 */
interface ReplyResponse {
  success: boolean;
  report: AdminGeneralReport;
}

/**
 * Adds authentication headers to a request configuration.
 * @param {RequestInit} init - Initial request configuration
 * @returns {RequestInit} Request configuration with auth headers
 */
function withAuth(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(init.headers || {}),
    },
  };
}

/**
 * Fetches general reports from the admin API filtered by status.
 * @param {GeneralReportStatus} status - Filter reports by 'open' or 'resolved'
 * @returns {Promise<AdminGeneralReport[]>} Array of matching reports
 * @throws {Error} If the API request fails
 */
export async function fetchGeneralReports(status: GeneralReportStatus): Promise<AdminGeneralReport[]> {
  const response = await apiGet(`/api/admin/general-reports?status=${status}`, withAuth());
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch general reports:', response.status, errorText);
    throw new Error('Failed to load reports');
  }
  const data = (await response.json()) as ReportsResponse;
  return data.reports || [];
}

/**
 * Sends an admin reply to a general report, marking it as resolved.
 * @param {string} id - The report ID to reply to
 * @param {string} message - The reply message content
 * @returns {Promise<AdminGeneralReport>} The updated report with the new reply
 * @throws {Error} If the API request fails
 */
export async function replyToGeneralReport(id: string, message: string): Promise<AdminGeneralReport> {
  const response = await apiPost(
    `/api/admin/general-reports/${encodeURIComponent(id)}/reply`,
    { message },
    withAuth()
  );

  if (!response.ok) throw new Error('Failed to send reply');
  const data = (await response.json()) as ReplyResponse;
  return data.report;
}

/**
 * Formats a report's display code for the UI.
 * Falls back to generating a code from the ID if reportCode is not present.
 * @param {AdminGeneralReport} report - The report to format
 * @returns {string} Human-readable report code
 */
export function formatReportCode(report: AdminGeneralReport): string {
  return report.reportCode || `GR${report.id.slice(-6).toUpperCase()}`;
}
