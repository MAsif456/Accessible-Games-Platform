import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import authService from '../../services/authService';
import * as adminReportsService from '../../services/adminReportsService';
import * as gamesAdminService from '../../services/gamesAdminService';
import * as api from '../../services/api';
import * as adminReviewsHooks from '../../hooks/adminReviews';
import * as adminReviewActionsHook from '../../hooks/useAdminReviewActions';

jest.mock('../../src/services/gamesAdminService', () => ({
  __esModule: true,
  getAdminGames: jest.fn().mockResolvedValue({ games: [] }),
  getAdminGameById: jest.fn(),
  createAdminGame: jest.fn(),
  updateAdminGame: jest.fn(),
  deleteAdminGame: jest.fn(),
}));

jest.mock('../../src/services/adminGameReportsService', () => ({
  __esModule: true,
  fetchGameReports: jest.fn().mockResolvedValue([]),
  replyToGameReport: jest.fn(),
}));

jest.mock('../../src/services/adminReportsService');
jest.mock('../../src/services/api', () => ({
  __esModule: true,
  getGames: jest.fn(),
  getReviewStats: jest.fn(),
  getAuthHeaders: jest.fn(() => ({})),
}));
jest.mock('../../src/hooks/adminReviews');
jest.mock('../../src/hooks/useAdminReviewActions');

// Minimal table-state helpers to keep adminReviews hooks quiet in this suite
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

// Reuse the AdminPage-style setup with an authenticated admin user
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

  (gamesAdminService.getAdminGames as jest.Mock).mockResolvedValue({ games: [] });
  jest.spyOn(api, 'getGames').mockResolvedValue({ games: [], total: 0 } as any);
  jest.spyOn(api, 'getReviewStats').mockResolvedValue({ totalReviews: 0 } as any);

  // Default admin reviews hooks to no-op table state to avoid network calls
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

const openGeneralReportsSection = async () => {
  const [primaryGeneralTab] = await screen.findAllByRole('tab', { name: /general reports/i });
  fireEvent.click(primaryGeneralTab);
};

// Alias types and mocks from the adminReportsService module
type Report = adminReportsService.AdminGeneralReport;

const mockFetchReports = adminReportsService.fetchGeneralReports as jest.Mock;
const mockReply = adminReportsService.replyToGeneralReport as jest.Mock;

const baseReport = (overrides: Partial<Report> = {}): Report => ({
  id: 'report-1',
  reportCode: 'GR0001',
  description: 'Navigation is confusing on mobile devices.',
  status: 'open',
  reporterEmail: 'user@example.com',
  reporterName: 'User Example',
  reporterId: null,
  createdAt: '2025-11-10T00:00:00.000Z',
  resolvedAt: null,
  adminReplies: [],
  ...overrides,
});

const mockReportFetchSequence = (open: Report[], resolved: Report[]) => {
  mockFetchReports.mockImplementation((status?: string) =>
    Promise.resolve(status === 'resolved' ? resolved : open),
  );
};

describe('AdminPage General Reports management', () => {
  afterEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  test('lists unresolved reports with description, reporter, and date', async () => {
    mockReportFetchSequence([baseReport()], []);

    setupAdminApp();
    await clickAdminButton();
    await openGeneralReportsSection();

    const table = await screen.findByRole('table', { name: /general reports table/i });
    const inTable = within(table);

    // ID cell is currently empty in the UI, so focus on visible fields
    expect(inTable.getByText(/navigation is confusing on mobile devices\./i)).toBeInTheDocument();
    expect(inTable.getByText(/user example/i)).toBeInTheDocument();
    expect(inTable.getByText(/10\/11\/2025/i)).toBeInTheDocument();
  });

  test('resolved reports tab shows resolved entries', async () => {
    mockReportFetchSequence([], [
      baseReport({
        id: 'report-2',
        reportCode: 'GR0002',
        status: 'resolved',
        resolvedAt: '2025-11-12T00:00:00.000Z',
      }),
    ]);

    setupAdminApp();
    await clickAdminButton();
    await openGeneralReportsSection();

    const resolvedTab = await screen.findByRole('tab', { name: /resolved reports/i });
    fireEvent.click(resolvedTab);

    await waitFor(() => {
      expect(mockFetchReports).toHaveBeenCalledWith('resolved');
    });

    const table = await screen.findByRole('table', { name: /resolved reports table/i });
    const inTable = within(table);

    // ID cell is empty in the UI; assert on description/date instead
    expect(inTable.getByText(/navigation is confusing on mobile devices\./i)).toBeInTheDocument();
    expect(inTable.getByText(/12\/11\/2025/i)).toBeInTheDocument();
  });

  test('replying to a general report calls reply API', async () => {
    const openReports = [baseReport()];
    mockReportFetchSequence(openReports, []);
    mockReply.mockResolvedValue(
      baseReport({ status: 'resolved', resolvedAt: '2025-11-11T00:00:00.000Z' }),
    );

    setupAdminApp();
    await clickAdminButton();
    await openGeneralReportsSection();

    const replyButton = await screen.findByRole('button', { name: /reply/i });
    fireEvent.click(replyButton);

    const modal = await screen.findByRole('dialog');
    const input = within(modal).getByRole('textbox');
    fireEvent.change(input, { target: { value: 'We have fixed the navigation.' } });

    const submitBtn = within(modal).getByRole('button', { name: /send/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockReply).toHaveBeenCalledWith('report-1', 'We have fixed the navigation.');
    });
  });

  test('search filters general reports list', async () => {
    mockReportFetchSequence(
      [
        baseReport({ reportCode: 'GR0003', description: 'Dark mode request.' }),
        baseReport({
          id: 'report-4',
          reportCode: 'GR0004',
          description: 'Footer contact form broken.',
        }),
      ],
      [],
    );

    setupAdminApp();
    await clickAdminButton();
    await openGeneralReportsSection();

    await screen.findByText(/dark mode request\./i);

    // Disambiguate from the global navbar search by scoping to the general reports section
    const section = await screen.findByRole('region', { name: /general reports/i });
    const searchInput = within(section).getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'footer' } });

    await waitFor(() => {
      expect(screen.queryByText(/dark mode request\./i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/footer contact form broken\./i)).toBeInTheDocument();
  });

  test('displays error when fetching open reports fails', async () => {
    mockFetchReports.mockImplementation((status?: string) =>
      status === 'open' ? Promise.reject(new Error('network')) : Promise.resolve([]),
    );

    setupAdminApp();
    await clickAdminButton();
    await openGeneralReportsSection();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
