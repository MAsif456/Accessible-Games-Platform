import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportForm from '../../components/report/ReportForm';
import { submitReport } from '../../services/reportApi';

jest.mock('../../services/reportApi', () => ({
  submitReport: jest.fn(),
}));

const mockedSubmitReport = submitReport as jest.Mock;

/**
 * Renders a ReportForm component with type set to 'general'.
 * Useful for testing the component's validation and submission logic.
 */
function renderForm() {
  render(<ReportForm type="general" />);
}

describe('ReportForm validation', () => {
  beforeEach(() => {
    mockedSubmitReport.mockReset();
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
