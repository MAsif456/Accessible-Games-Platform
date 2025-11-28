import axios from 'axios';

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

export async function submitReport(payload: SubmitReportPayload): Promise<SubmitReportResponse> {
  const response = await axios.post('/api/reports', payload);
  return response.data;
}
