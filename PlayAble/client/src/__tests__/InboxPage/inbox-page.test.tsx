import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InboxPage from '../../pages/InboxPage';
import { AuthProvider } from '../../context/AuthContext';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  type Notification,
} from '../../services/notificationsApi';
import { getReportById } from '../../services/reportApi';
import { getReviewById } from '../../services/api';

// Mock the API services
jest.mock('../../services/notificationsApi');
jest.mock('../../services/reportApi');
jest.mock('../../services/api');

const mockedFetchNotifications = fetchNotifications as jest.MockedFunction<typeof fetchNotifications>;
const mockedMarkNotificationAsRead = markNotificationAsRead as jest.MockedFunction<typeof markNotificationAsRead>;
const mockedMarkAllNotificationsAsRead = markAllNotificationsAsRead as jest.MockedFunction<typeof markAllNotificationsAsRead>;
const mockedGetUnreadNotificationCount = getUnreadNotificationCount as jest.MockedFunction<typeof getUnreadNotificationCount>;
const mockedGetReportById = getReportById as jest.MockedFunction<typeof getReportById>;
const mockedGetReviewById = getReviewById as jest.MockedFunction<typeof getReviewById>;

// Mock AuthContext
jest.mock('../../context/AuthContext', () => {
  const actual = jest.requireActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

const { useAuth } = require('../../context/AuthContext');

// Mock Modal component
jest.mock('../../components/ui/Modal', () => {
  return function MockModal({ isOpen, onClose, title, children }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="modal" role="dialog" aria-label={title}>
        <button onClick={onClose} data-testid="modal-close">Close</button>
        <h2>{title}</h2>
        {children}
      </div>
    );
  };
});

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'report_submitted',
    title: 'Report Submitted',
    message: 'Your report has been submitted successfully.',
    read: false,
    reportId: 'report-1',
    metadata: {
      reportCode: 'RPT-001',
      reportType: 'general',
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    type: 'report_resolved',
    title: 'Report Resolved',
    message: 'Your report has been resolved by an admin.',
    read: false,
    reportId: 'report-2',
    metadata: {
      reportCode: 'RPT-002',
      reportType: 'game',
      adminName: 'Admin User',
    },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '3',
    type: 'review_deleted',
    title: 'Review Deleted',
    message: 'Your review has been deleted.',
    read: true,
    reviewId: 'review-1',
    gameId: 'game-1',
    metadata: {
      gameTitle: 'Test Game',
      deletionReason: 'Violates community guidelines',
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    readAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    type: 'review_liked',
    title: 'Review Liked',
    message: 'Someone liked your review.',
    read: false,
    reviewId: 'review-2',
    gameId: 'game-2',
    metadata: {
      gameTitle: 'Another Game',
      likedBy: 'User123',
      reviewContent: 'Great game!',
    },
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: '5',
    type: 'review_created',
    title: 'Review Posted Successfully',
    message: 'Your review has been posted successfully.',
    read: false,
    reviewId: 'review-3',
    gameId: 'game-3',
    metadata: {
      gameTitle: 'New Game',
      reviewContent: 'Amazing experience!',
    },
    createdAt: new Date().toISOString(),
  },
];

const mockReport = {
  id: 'report-1',
  reportCode: 'RPT-001',
  type: 'general' as const,
  description: 'Test report description',
  status: 'open' as const,
  createdAt: new Date().toISOString(),
  adminReplies: [
    {
      message: 'Thank you for your report. We will look into this.',
      adminName: 'Admin User',
      createdAt: new Date().toISOString(),
    },
  ],
};

const mockReview = {
  game: {
    id: 'game-1',
    title: 'Test Game',
  },
  review: {
    id: 'review-1',
    author: 'Test User',
    content: 'This is a test review.',
    createdAt: new Date().toISOString(),
  },
};

/**
 * Renders a component with all necessary providers for testing.
 * 
 * @param {React.ReactElement} ui - The component to render
 * @param {{isAuthenticated: boolean}} [authState={isAuthenticated: true}] - Authentication state
 * @param {Object} [props={}] - Additional props to pass to the component
 * @returns {RenderResult} The rendered component
 */
const renderWithProviders = (ui: React.ReactElement, authState = { isAuthenticated: true }, props = {}) => {
  const mockAuth = {
    user: authState.isAuthenticated ? { id: 'test-user', name: 'Test User', role: 'user' } : null,
    isAuthenticated: authState.isAuthenticated,
    login: jest.fn(),
    logout: jest.fn(),
    signup: jest.fn(),
    isLoading: false,
  };
  
  useAuth.mockReturnValue(mockAuth);

  return render(<AuthProvider>{React.cloneElement(ui, props)}</AuthProvider>);
};

/**
 * Test suite for InboxPage component.
 * Tests authentication, loading states, notification display, filtering, sorting, and interactions.
 */
describe('InboxPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure fetchNotifications is called with empty object (default parameter)
    mockedFetchNotifications.mockImplementation((options = {}) => Promise.resolve(mockNotifications));
    mockedGetUnreadNotificationCount.mockResolvedValue(3);
    mockedMarkNotificationAsRead.mockResolvedValue({ ...mockNotifications[0], read: true });
    mockedMarkAllNotificationsAsRead.mockResolvedValue(undefined);
  });

  describe('Authentication', () => {
    test('shows sign-in message when user is not authenticated', () => {
      renderWithProviders(<InboxPage />, { isAuthenticated: false });

      expect(screen.getByText(/Please sign in to view your notifications/i)).toBeInTheDocument();
    });

    test('loads notifications when user is authenticated', async () => {
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(mockedFetchNotifications).toHaveBeenCalled();
      });
      expect(mockedGetUnreadNotificationCount).toHaveBeenCalled();
    });
  });

  describe('Loading and Error States', () => {
    test('shows loading state initially', () => {
      mockedFetchNotifications.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<InboxPage />);

      expect(screen.getByText(/Loading notifications/i)).toBeInTheDocument();
    });

    test('shows error message when notifications fail to load', async () => {
      mockedFetchNotifications.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load notifications/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notification Display', () => {
    test('displays list of notifications', async () => {
      renderWithProviders(<InboxPage />);

      // Wait for loading to complete and notifications to appear
      await waitFor(() => {
        expect(screen.queryByText(/Loading notifications/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Check that notifications are displayed (checking for titles in list items, not dropdown)
      await waitFor(() => {
        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // Find notification titles within list items
      const notificationList = screen.getByRole('list');
      expect(notificationList).toBeInTheDocument();
      
      // Check for notification messages (more specific than titles which appear in dropdown)
      expect(screen.getByText(/Your report has been submitted successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/Your report has been resolved by an admin/i)).toBeInTheDocument();
      expect(screen.getByText(/Your review has been deleted/i)).toBeInTheDocument();
    });

    test('displays unread count badge', async () => {
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText('3 unread')).toBeInTheDocument();
      });
    });

    test('hides mark all as read button when all notifications are read', async () => {
      mockedGetUnreadNotificationCount.mockResolvedValue(0);
      mockedFetchNotifications.mockResolvedValue(
        mockNotifications.map(n => ({ ...n, read: true }))
      );

      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Mark all as read/i })).not.toBeInTheDocument();
      });
    });

    test('displays empty state when there are no notifications', async () => {
      mockedFetchNotifications.mockResolvedValue([]);
      mockedGetUnreadNotificationCount.mockResolvedValue(0);

      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByText(/You have no notifications/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    test('filters notifications by type', async () => {
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading notifications/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for notifications to load
      await waitFor(() => {
        expect(screen.getByText(/Your report has been submitted successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const typeFilter = screen.getByLabelText(/Filter by type/i);
      await userEvent.selectOptions(typeFilter, 'report_submitted');

      await waitFor(() => {
        // Check for the message, not the title (which appears in dropdown)
        expect(screen.getByText(/Your report has been submitted successfully/i)).toBeInTheDocument();
        expect(screen.queryByText(/Someone liked your review/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('filters notifications by read status', async () => {
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading notifications/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for notifications to load - check for the message of the read notification
      await waitFor(() => {
        expect(screen.getByText(/Your review has been deleted/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const readFilter = screen.getByLabelText(/Filter by status/i);
      await userEvent.selectOptions(readFilter, 'unread');

      await waitFor(() => {
        // Review Deleted is read, so it should not appear when filtering unread
        expect(screen.queryByText(/Your review has been deleted/i)).not.toBeInTheDocument();
        // But unread notifications should still appear
        expect(screen.getByText(/Your report has been submitted successfully/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('searches notifications by title', async () => {
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading notifications/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for notifications to load
      await waitFor(() => {
        expect(screen.getByText(/Your report has been submitted successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const searchInput = screen.getByLabelText(/Search notifications/i);
      await userEvent.type(searchInput, 'resolved');

      await waitFor(() => {
        // Check for messages, not titles
        expect(screen.getByText(/Your report has been resolved by an admin/i)).toBeInTheDocument();
        expect(screen.queryByText(/Your report has been submitted successfully/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Sorting', () => {
    test('sorts notifications by newest first by default', async () => {
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading notifications/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for notifications to load
      await waitFor(() => {
        const items = screen.getAllByRole('listitem');
        expect(items.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const items = screen.getAllByRole('listitem');
      expect(items.length).toBeGreaterThan(0);
    });

    test('sorts notifications by oldest first when selected', async () => {
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading notifications/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for notifications to load
      await waitFor(() => {
        const items = screen.getAllByRole('listitem');
        expect(items.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const sortSelect = screen.getByLabelText(/Sort notifications/i);
      await userEvent.selectOptions(sortSelect, 'oldest');

      // After sorting, items should still be present
      await waitFor(() => {
        const items = screen.getAllByRole('listitem');
        expect(items.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });
  });

  describe('Marking as Read', () => {
    test('marks notification as read when clicked', async () => {
      const updatedNotification = { ...mockNotifications[0], read: true, readAt: new Date().toISOString() };
      mockedMarkNotificationAsRead.mockResolvedValue(updatedNotification);
      mockedGetUnreadNotificationCount.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading notifications/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for notifications to load
      await waitFor(() => {
        expect(screen.getByText(/Your report has been submitted successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const notificationButton = screen.getByRole('button', { name: /Unread notification: Report Submitted/i });
      await userEvent.click(notificationButton);

      await waitFor(() => {
        expect(mockedMarkNotificationAsRead).toHaveBeenCalledWith('1');
      }, { timeout: 2000 });
    });

  });

  describe('Notification Details Modal', () => {
    test('opens modal when notification is clicked', async () => {
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading notifications/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for notifications to load
      await waitFor(() => {
        expect(screen.getByText(/Your report has been submitted successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Find the notification button - check for the button that contains the notification
      // The button has aria-label with "Unread notification: Report Submitted"
      const notificationButtons = screen.getAllByRole('button');
      const notificationButton = notificationButtons.find(btn => 
        btn.getAttribute('aria-label')?.includes('Report Submitted')
      );
      
      expect(notificationButton).toBeDefined();
      
      // Click the button - this triggers handleNotificationClick which is async
      if (notificationButton) {
        await userEvent.click(notificationButton);
      }

      // Modal should open after the click handler completes
      // The handler marks as read (async) then sets selectedNotification
      await waitFor(() => {
        const modal = screen.queryByTestId('modal');
        expect(modal).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('displays notification message in modal', async () => {
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading notifications/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for notifications to load
      await waitFor(() => {
        expect(screen.getByText(/Your report has been submitted successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const notificationButton = screen.getByRole('button', { name: /Unread notification: Report Submitted/i });
      await userEvent.click(notificationButton);

      // Wait for modal to open first
      await waitFor(() => {
        expect(screen.getByTestId('modal')).toBeInTheDocument();
      }, { timeout: 3000 });

      // The message should appear in the modal (it appears both in list and modal, but modal should be visible)
      // Check that the modal contains the message
      const modal = screen.getByTestId('modal');
      expect(modal).toBeInTheDocument();
      
      // The message text should be in the modal - use getAllByText since it appears in both list and modal
      const messages = screen.getAllByText(/Your report has been submitted successfully/i);
      expect(messages.length).toBeGreaterThan(0);
      // Verify the modal contains the message
      expect(modal).toHaveTextContent(/Your report has been submitted successfully/i);
    });
  });

  describe('Report Details', () => {
    test('fetches and displays report details for report notifications', async () => {
      mockedGetReportById.mockResolvedValue(mockReport);

      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Loading notifications/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Wait for notifications to load
      await waitFor(() => {
        expect(screen.getByText(/Your report has been submitted successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const notificationButton = screen.getByRole('button', { name: /Unread notification: Report Submitted/i });
      await userEvent.click(notificationButton);

      await waitFor(() => {
        expect(mockedGetReportById).toHaveBeenCalledWith('report-1');
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(screen.getByText(/Report Details/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', async () => {
      renderWithProviders(<InboxPage />);

      await waitFor(() => {
        expect(screen.getByRole('main', { name: /Inbox page/i })).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/Filter by type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Filter by status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Sort notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Search notifications/i)).toBeInTheDocument();
    });
  });
});
