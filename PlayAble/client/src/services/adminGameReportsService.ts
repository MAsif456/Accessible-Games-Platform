import { getAuthHeaders } from './api';
import { apiPost, apiGet } from '../utils/apiHelper';

export type GameReportStatus = 'open' | 'resolved';

export interface AdminGameReport {
  id: string;
  reportCode: string;
  gameId: string | null;
  gameTitle: string;
  issueType: string;
  description: string;
  status: GameReportStatus;
  reporterEmail: string | null;
  reporterName: string | null;
  reporterId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
  resolvedById: string | null;
  adminReplies: Array<{
    message: string;
    adminName: string;
    createdAt: string;
  }>;
}

interface GameReportsResponse {
  reports: AdminGameReport[];
}

interface GameReportReplyResponse {
  success: boolean;
  report: AdminGameReport;
}

const withAuth = (init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(init.headers || {}),
  },
});

/**
 * Fetches game reports filtered by status.
 *
 * @param status - Report status filter ('open' or 'resolved')
 */
export async function fetchGameReports(status: GameReportStatus): Promise<AdminGameReport[]> {
  const response = await apiGet(`/api/admin/game-reports?status=${status}`, withAuth());
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch game reports:', response.status, errorText);
    throw new Error('Failed to load game reports');
  }
  const data = (await response.json()) as GameReportsResponse;
  return data.reports || [];
}

/**
 * Sends an admin reply for the provided game report and marks it as resolved.
 *
 * @param id - Report ID
 * @param message - Reply text
 */
export async function replyToGameReport(id: string, message: string): Promise<AdminGameReport> {
  const response = await apiPost(
    `/api/admin/game-reports/${encodeURIComponent(id)}/reply`,
    { message },
    withAuth()
  );

  if (!response.ok) {
    throw new Error('Failed to send reply');
  }

  const data = (await response.json()) as GameReportReplyResponse;
  return data.report;
}
