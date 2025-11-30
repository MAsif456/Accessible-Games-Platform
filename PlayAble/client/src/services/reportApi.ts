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
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to submit report');
  }

  return response.json();
}
