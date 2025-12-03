//import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminPage from '../../pages/AdminPage';
import * as adminReviewsHooks from '../../hooks/adminReviews';
import * as adminReviewActionsHook from '../../hooks/useAdminReviewActions';

jest.mock('../../src/services/gamesAdminService', () => ({
  __esModule: true,
  getAdminGames: jest.fn().mockResolvedValue({ games: [] }),
}));

jest.mock('../../src/services/adminGameReportsService', () => ({
  __esModule: true,
  fetchGameReports: jest.fn().mockResolvedValue([]),
  replyToGameReport: jest.fn(),
}));

jest.mock('../../src/hooks/adminReviews');
jest.mock('../../src/hooks/useAdminReviewActions');

const makeTableState = <T,>(overrides: Partial<adminReviewsHooks.UseTableState<T>> = {}) => ({
  items: [],
  loading: false,
  error: null,
  searchTerm: '',
  page: 1,
  pageSize: 7,
  total: 0,
  setSearchTerm: jest.fn(),
  setPage: jest.fn(),
  refresh: jest.fn(),
  ...overrides,
});

const mockReviewsTable = adminReviewsHooks.useReviewsTable as jest.Mock;
const mockReportedTable = adminReviewsHooks.useReportedReviewsTable as jest.Mock;
const mockResolvedTable = adminReviewsHooks.useResolvedReportedReviewsTable as jest.Mock;
const mockActionsHook = adminReviewActionsHook.default as unknown as jest.Mock;

beforeEach(() => {
  mockActionsHook.mockReturnValue({
    deleteReview: jest.fn(),
    sendAdminReply: jest.fn(),
    resolveReportedReview: jest.fn(),
    error: null,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

const renderAdminPageOnReviewsTab = () => {
  render(<AdminPage showPrompt={jest.fn()} />);
  const reviewsTab = screen.getByRole('tab', { name: /reviews management/i });
  fireEvent.click(reviewsTab);
};

describe('Admin reviews tab UI', () => {
  test('Delete review modal shows the review ID for context', async () => {
    mockReviewsTable.mockReturnValue(
      makeTableState({
        items: [
          {
            _id: 'review-1',
            publicId: 'REV-12345',
            gameTitle: 'Example Game',
            authorName: 'Alice',
            body: 'An accessible and fun experience.',
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );
    mockReportedTable.mockReturnValue(makeTableState());
    mockResolvedTable.mockReturnValue(makeTableState());

    renderAdminPageOnReviewsTab();

    const deleteBtn = await screen.findByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);

    const modalHeading = await screen.findByRole('heading', { name: /delete review/i });
    const modal = (modalHeading.closest('[role="dialog"]') as HTMLElement | null) || document.body;
    expect(within(modal).getByText(/rev-12345/i)).toBeInTheDocument();
  });

  test('Moderator reply is sent when resolving a reported review', async () => {
    const sendAdminReply = jest.fn();
    const resolveReportedReview = jest.fn();
    mockActionsHook.mockReturnValue({
      deleteReview: jest.fn(),
      sendAdminReply,
      resolveReportedReview,
      error: null,
    });

    mockReviewsTable.mockReturnValue(makeTableState());
    mockReportedTable.mockReturnValue(
      makeTableState({
        items: [
          {
            _id: 'report-1',
            reviewId: 'review-abc',
            reviewPublicId: 'REV-ABC',
            gameTitle: 'Game One',
            reportReason: 'Spam',
            reviewAuthorName: 'Bob',
            reviewBody: 'bad text',
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );
    mockResolvedTable.mockReturnValue(makeTableState());

    renderAdminPageOnReviewsTab();

    const reportedTabs = screen.getAllByRole('tab', { name: /reported reviews/i });
    fireEvent.click(reportedTabs[0]);

    const resolveButton = await screen.findByRole('button', { name: /resolve/i });
    fireEvent.click(resolveButton);

    const replyBox = await screen.findByPlaceholderText(/explain the decision/i);
    fireEvent.change(replyBox, { target: { value: 'Reply from moderator' } });

    expect(
      screen.getByText(/any reply entered here will be sent when you choose complete or delete review/i)
    ).toBeInTheDocument();

    const deleteReviewAction = screen.getByRole('button', { name: /delete review/i });
    fireEvent.click(deleteReviewAction);

    const confirmDialogHeading = await screen.findByRole('heading', { name: /^delete review$/i });
    const confirmDialog = confirmDialogHeading.closest('[role="dialog"]');
    if (!confirmDialog) throw new Error('Confirm dialog not found');
    const confirmDeleteButton = confirmDialog.querySelector('button.dialog__button--primary');
    if (!confirmDeleteButton) throw new Error('Confirm delete button not found');
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(sendAdminReply).toHaveBeenCalledWith('review-abc', 'Reply from moderator');
      expect(resolveReportedReview).toHaveBeenCalledWith('report-1', 'delete-review');
    });
  });

  test('Resolved reported reviews can be opened for details', async () => {
    mockReviewsTable.mockReturnValue(makeTableState());
    mockReportedTable.mockReturnValue(makeTableState());
    mockResolvedTable.mockReturnValue(
      makeTableState({
        items: [
          {
            _id: 'resolved-1',
            reviewId: 'review-xyz',
            reportReason: 'Resolved reason',
            outcome: 'kept',
            gameTitle: 'Resolved Game',
            reviewAuthorName: 'Dana',
            createdAt: new Date().toISOString(),
          },
        ],
      })
    );

    renderAdminPageOnReviewsTab();

    const resolvedTab = screen.getByRole('tab', { name: /resolved reported reviews/i });
    fireEvent.click(resolvedTab);

    const viewButton = await screen.findByRole('button', { name: /view/i });
    fireEvent.click(viewButton);

    const modalHeading = await screen.findByRole('heading', { name: /review report details/i });
    const modal = (modalHeading.closest('[role="dialog"]') as HTMLElement | null) || document.body;
    expect(within(modal).getByText(/resolved game/i)).toBeInTheDocument();
    expect(within(modal).getAllByText(/resolved reason/i).length).toBeGreaterThan(0);
  });
});
