import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';
import authService from '../../src/services/authService';
import * as api from '../../src/services/api';
import * as adminGameReportsService from '../../src/services/adminGameReportsService';
import * as adminReviewsHooks from '../../src/hooks/adminReviews';
import * as adminReviewActionsHook from '../../src/hooks/useAdminReviewActions';

jest.mock('../../src/services/gamesAdminService', () => ({
  __esModule: true,
  getAdminGames: jest.fn().mockResolvedValue({ games: [] }),
  getAdminGameById: jest.fn(),
  createAdminGame: jest.fn(),
  updateAdminGame: jest.fn(),
  deleteAdminGame: jest.fn(),
}));

jest.mock('../../src/services/adminReportsService', () => ({
  __esModule: true,
  fetchGeneralReports: jest.fn().mockResolvedValue([]),
  replyToGeneralReport: jest.fn(),
  formatReportCode: jest.fn((report: { reportCode?: string; id: string }) => report.reportCode || report.id),
}));

jest.mock('../../src/services/adminGameReportsService');
jest.mock('../../src/services/api', () => ({
  __esModule: true,
  getGames: jest.fn(),
  getReviewStats: jest.fn(),
  getAuthHeaders: jest.fn(() => ({})),
  getGamesMetadata: jest.fn().mockResolvedValue({
    genres: [],
    accessibilityTags: [],
    platforms: [],
    featureGroups: [],
    tags: [],
    modes: [],
    inputMethods: [],
    publishers: [],
    developers: [],
    themes: [],
    languages: [],
    releaseYears: [],
  }),
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

const mockFetchGameReports = adminGameReportsService.fetchGameReports as jest.Mock;
const mockReplyToGameReport = adminGameReportsService.replyToGameReport as jest.Mock;

const mockAdminUser = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin' as const,
};

function setupAdminApp() {
  window.localStorage.setItem('user', JSON.stringify(mockAdminUser));
  window.localStorage.setItem('token', 'fake-admin-token');

  jest.spyOn(authService, 'getCurrentUser').mockResolvedValue({
    success: true,
    message: 'ok',
    user: mockAdminUser,
  } as any);

  jest.spyOn(api, 'getGames').mockResolvedValue({ games: [], total: 0 } as any);
  jest.spyOn(api, 'getReviewStats').mockResolvedValue({ totalReviews: 0 } as any);

  mockReviewsTable.mockReturnValue(makeTableState());
  mockReportedTable.mockReturnValue(makeTableState());
  mockResolvedTable.mockReturnValue(makeTableState());
  mockActionsHook.mockReturnValue({
    deleteReview: jest.fn(),
    sendAdminReply: jest.fn(),
    resolveReportedReview: jest.fn(),
    error: null,
  });

  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
}

const clickAdminButton = async () => {
  const adminLabel = await screen.findByText(/admin/i);
  const adminButton = adminLabel.closest('button');
  if (!adminButton) throw new Error('Admin button not found');
  fireEvent.click(adminButton);
};

const openGamesManagement = async () => {
  await clickAdminButton();
  const gamesTab = await screen.findByRole('tab', { name: /games management/i });
  fireEvent.click(gamesTab);
};

const openGamesSubTab = async (name: RegExp) => {
  const panel = await screen.findByRole('tabpanel', { name: /games management/i });
  const tab = await within(panel).findByRole('tab', { name });
  fireEvent.click(tab);
};

type GameReport = adminGameReportsService.AdminGameReport;

const baseReport = (overrides: Partial<GameReport> = {}): GameReport => ({
  id: 'report-1',
  reportCode: 'RG-001',
  gameId: 'game-1',
  gameTitle: 'Celeste',
  issueType: 'Accessibility Issue',
  description: 'Screen reader not announcing level completion properly',
  status: 'open',
  reporterEmail: 'user@example.com',
  reporterName: 'User Example',
  reporterId: null,
  createdAt: '2025-10-20T00:00:00.000Z',
  resolvedAt: null,
  resolvedByName: null,
  resolvedById: null,
  adminReplies: [],
  ...overrides,
});

const mockReportFetchSequence = (open: GameReport[], resolved: GameReport[]) => {
  mockFetchGameReports.mockImplementation((status?: string) =>
    Promise.resolve(status === 'resolved' ? resolved : open),
  );
};

describe('AdminPage Game Reports management', () => {
  afterEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  test('reported games table lists incoming reports with issue type and game name', async () => {
    mockReportFetchSequence([baseReport()], []);
    setupAdminApp();
    await openGamesManagement();
    await openGamesSubTab(/^reported games$/i);

    const table = await screen.findByRole('table', { name: /reported games table/i });
    const inTable = within(table);

    expect(inTable.getByText(/celeste/i)).toBeInTheDocument();
    expect(inTable.getByText(/accessibility issue/i)).toBeInTheDocument();
    expect(inTable.getByText(/screen reader not announcing/i)).toBeInTheDocument();
    expect(inTable.getByText(/20\/10\/2025/i)).toBeInTheDocument();
  });

  test('resolved tab shows resolved game reports with resolution info', async () => {
    mockReportFetchSequence(
      [],
      [
        baseReport({
          id: 'report-2',
          reportCode: 'RG-002',
          status: 'resolved',
          resolvedAt: '2025-10-25T00:00:00.000Z',
          resolvedByName: 'Admin User',
        }),
      ],
    );

    setupAdminApp();
    await openGamesManagement();
    await openGamesSubTab(/^resolved reported games$/i);

    await waitFor(() => {
      expect(mockFetchGameReports).toHaveBeenCalledWith('resolved');
    });

    const table = await screen.findByRole('table', { name: /resolved reported games table/i });
    const inTable = within(table);
    expect(inTable.getByText(/rg-002/i)).toBeInTheDocument();
    expect(inTable.getByText(/admin user/i)).toBeInTheDocument();
    expect(inTable.getByText(/25\/10\/2025/i)).toBeInTheDocument();
  });

  test('replying to a game report sends reply and resolves entry', async () => {
    mockReportFetchSequence([baseReport()], []);
    mockReplyToGameReport.mockResolvedValue(
      baseReport({ status: 'resolved', resolvedAt: '2025-10-22T00:00:00.000Z' }),
    );

    setupAdminApp();
    await openGamesManagement();
    await openGamesSubTab(/^reported games$/i);

    const replyButton = await screen.findByRole('button', { name: /reply/i });
    fireEvent.click(replyButton);

    const modal = await screen.findByRole('dialog');
    const input = within(modal).getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Thanks for reporting, issue resolved.' } });

    const submitBtn = within(modal).getByRole('button', { name: /send reply & resolve/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockReplyToGameReport).toHaveBeenCalledWith(
        'report-1',
        'Thanks for reporting, issue resolved.',
      );
    });
  });

  test('reported games search input filters results', async () => {
    mockReportFetchSequence(
      [
        baseReport({ gameTitle: 'Celeste', description: 'audio bug' }),
        baseReport({
          id: 'report-2',
          reportCode: 'RG-002',
          gameTitle: 'Hollow Knight',
          description: 'subtitle options missing',
        }),
      ],
      [],
    );

    setupAdminApp();
    await openGamesManagement();
    await openGamesSubTab(/^reported games$/i);

    const searchInput = await screen.findByLabelText(/search reported games/i);
    fireEvent.change(searchInput, { target: { value: 'hollow' } });

    await waitFor(() => {
      const panel = screen.getByRole('tabpanel', { name: /games management/i });
      expect(within(panel).queryByText(/celeste/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/hollow knight/i)).toBeInTheDocument();
  });

  test('resolved game report modal shows previous admin reply information', async () => {
    mockReportFetchSequence([], [
      baseReport({
        id: 'report-3',
        reportCode: 'RG-003',
        status: 'resolved',
        resolvedAt: '2025-10-18T00:00:00.000Z',
        resolvedByName: 'Admin Jane',
        adminReplies: [
          {
            message: 'Issue documented and resolved.',
            adminName: 'Admin Jane',
            createdAt: '2025-10-18T00:00:00.000Z',
          },
        ],
      }),
    ]);

    setupAdminApp();
    await openGamesManagement();
    await openGamesSubTab(/^resolved reported games$/i);

    const panel = screen.getByRole('tabpanel', { name: /games management/i });
    const viewButton = await within(panel).findByRole('button', { name: /view/i });
    fireEvent.click(viewButton);

    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/rg-003/i)).toBeInTheDocument();
    expect(within(modal).getByText(/issue documented and resolved/i)).toBeInTheDocument();
    expect(within(modal).getAllByText(/admin jane/i).length).toBeGreaterThan(0);
  });
});
