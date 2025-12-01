import { getAuthHeaders } from './api';
import { apiPost } from '../utils/apiHelper';

export type GeneralReportStatus = 'open' | 'resolved';

export interface AdminGeneralReport {
  id: string;
  reportCode: string;
  description: string;
  status: GeneralReportStatus;
  reporterEmail: string | null;
  reporterName: string | null;
  reporterId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  adminReplies: Array<{
    message: string;
    adminName: string;
    createdAt: string;
  }>;
}

interface ReportsResponse {
  reports: AdminGeneralReport[];
}

interface ReplyResponse {
  success: boolean;
  report: AdminGeneralReport;
}

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

export async function fetchGeneralReports(status: GeneralReportStatus): Promise<AdminGeneralReport[]> {
  const response = await fetch(`/api/admin/general-reports?status=${status}`, withAuth());
  if (!response.ok) throw new Error('Failed to load reports');
  const data = (await response.json()) as ReportsResponse;
  return data.reports || [];
}

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

export function formatReportCode(report: AdminGeneralReport): string {
  return report.reportCode || `GR${report.id.slice(-6).toUpperCase()}`;
}
