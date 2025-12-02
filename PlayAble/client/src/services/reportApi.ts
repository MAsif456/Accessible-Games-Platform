import { apiPost } from '../utils/apiHelper';

export type ReportType = 'general' | 'game' | 'review';

export interface SubmitReportPayload {
  type: ReportType;
  description?: string;
  transcript?: string;
  gameId?: string;
  reviewId?: string;
}

export interface SubmitReportResponse {
  success: boolean;
  message: string;
}

/**
 * Submit a report to the server. Voice transcript is optional; description must be validated upstream.
 */
export async function submitReport(payload: SubmitReportPayload): Promise<SubmitReportResponse> {
  const response = await apiPost('/api/reports', payload);

  if (!response.ok) {
    throw new Error('Failed to submit report');
  }

  return response.json();
}
