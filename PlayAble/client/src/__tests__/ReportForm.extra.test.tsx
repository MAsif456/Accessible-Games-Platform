import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportForm from '../components/report/ReportForm';

jest.mock('../services/reportApi', () => ({
  ReportType: { general: 'general' },
  submitReport: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../hooks/useVoiceRecording', () => ({
  useVoiceRecording: () => ({
    transcript: 'voice text',
    isRecording: false,
    error: null,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    clearTranscript: jest.fn(),
    hasTranscript: true,
  }),
}));

jest.mock('../context/VoiceAssistantContext', () => ({
  useVoiceAssistant: () => ({
    cancelListening: jest.fn(),
    forceStopRecognition: jest.fn(),
    microphoneActive: true,
    voiceInputEnabled: true,
  }),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'user@example.com', name: 'User', id: 'u1' } }),
}));

const { submitReport } = jest.requireMock('../services/reportApi');

describe('ReportForm additional coverage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('submits successfully with voice transcript', async () => {
    const onSuccess = jest.fn();
    render(<ReportForm type="general" onSuccess={onSuccess} />);

    // Description left short to rely on transcript path
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => expect(submitReport).toHaveBeenCalled());
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows voice navigation error when already listening', async () => {
    render(<ReportForm type="general" />);
    fireEvent.click(screen.getByRole('button', { name: /record again/i }));
    await waitFor(() =>
      expect(screen.getByText(/voice navigation must be turned off/i)).toBeInTheDocument()
    );
  });
});
