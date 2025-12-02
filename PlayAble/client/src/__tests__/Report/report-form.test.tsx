import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportForm from '../../components/report/ReportForm';
import { submitReport } from '../../services/reportApi';
import { VoiceAssistantProvider } from '../../context/VoiceAssistantContext';
import { AuthProvider } from '../../context/AuthContext';

jest.mock('../../services/reportApi', () => ({
  submitReport: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => {
  const actual = jest.requireActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

const mockedSubmitReport = submitReport as jest.Mock;
const { useAuth } = require('../../context/AuthContext');

// Mock navigator.mediaDevices for voice recording
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() => Promise.resolve({})),
  },
});

// Mock SpeechRecognition
const mockRecognition = {
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  onresult: null,
  onerror: null,
  onend: null,
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
};

Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: jest.fn(() => mockRecognition),
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  writable: true,
  value: jest.fn(() => mockRecognition),
});

function renderForm() {
  const mockOnNavigate = jest.fn();
  const mockSetSearchTerm = jest.fn();
  
  render(
    <AuthProvider>
      <VoiceAssistantProvider onNavigate={mockOnNavigate} setSearchTerm={mockSetSearchTerm}>
        <ReportForm type="general" />
      </VoiceAssistantProvider>
    </AuthProvider>
  );
}

describe('ReportForm validation', () => {
  beforeEach(() => {
    mockedSubmitReport.mockReset();
    // Mock user with email for general reports
    useAuth.mockReturnValue({
      user: { id: 'test-user', name: 'Test User', email: 'test@example.com', role: 'user' },
      userSettings: null,
    });
  });

  it('shows an error when description is shorter than 10 characters', async () => {
    const user = userEvent.setup();
    renderForm();

    const textarea = screen.getByLabelText(/written description/i);
    await user.type(textarea, 'short');

    await user.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() =>
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument()
    );
    expect(mockedSubmitReport).not.toHaveBeenCalled();
  });

  it('shows an error when description exceeds 1000 characters', async () => {
    const user = userEvent.setup();
    renderForm();

    const textarea = screen.getByLabelText(/written description/i);
    const tooLong = 'a'.repeat(1001);
    fireEvent.change(textarea, { target: { value: tooLong } });

    await user.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() =>
      expect(screen.getByText(/under 1000 characters/i)).toBeInTheDocument()
    );
    expect(mockedSubmitReport).not.toHaveBeenCalled();
  });

  it('submits when description is within limits', async () => {
    const user = userEvent.setup();
    mockedSubmitReport.mockResolvedValue({ success: true, message: 'ok' });
    renderForm();

    const textarea = screen.getByLabelText(/written description/i);
    const message = 'This is a valid report description.';
    await user.type(textarea, message);

    await user.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => expect(mockedSubmitReport).toHaveBeenCalledTimes(1));
    expect(mockedSubmitReport).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'general',
        description: message,
      })
    );

    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe(''));
    expect(screen.queryByText(/at least 10 characters/i)).not.toBeInTheDocument();
  });
});
