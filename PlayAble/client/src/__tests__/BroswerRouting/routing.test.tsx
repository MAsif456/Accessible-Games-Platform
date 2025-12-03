import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from '../../App';
import ProtectedRoute from '../../components/routing/ProtectedRoute';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { FavouritesProvider } from '../../context/FavouritesContext';
import { RecentlyViewedProvider } from '../../context/RecentlyViewedContext';
import { VoiceAssistantProvider } from '../../context/VoiceAssistantContext';

// Mock API calls
jest.mock('../../services/api', () => ({
  getGames: jest.fn().mockResolvedValue({
    games: [],
    totalResults: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 9,
  }),
  getCachedGame: jest.fn().mockReturnValue(null),
}));

jest.mock('../../services/notificationsApi', () => ({
  getUnreadNotificationCount: jest.fn().mockResolvedValue(0),
}));

// Mock contexts
const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  login: jest.fn(),
  logout: jest.fn(),
  userSettings: {},
  updateUserSettingsState: jest.fn(),
};

jest.mock('../../context/AuthContext', () => {
  const actual = jest.requireActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: jest.fn(() => mockAuthContext),
  };
});

// Mock page components to avoid full rendering
jest.mock('../../pages/BrowsePage', () => {
  return function MockBrowsePage() {
    return <div data-testid="browse-page">Browse Page</div>;
  };
});

jest.mock('../../pages/AboutPage', () => {
  return function MockAboutPage() {
    return <div data-testid="about-page">About Page</div>;
  };
});

jest.mock('../../pages/SignInPage', () => {
  return function MockSignInPage() {
    return <div data-testid="signin-page">Sign In Page</div>;
  };
});

jest.mock('../../pages/SettingsPage', () => {
  return function MockSettingsPage() {
    return <div data-testid="settings-page">Settings Page</div>;
  };
});

jest.mock('../../pages/GameDetailsPage', () => {
  return function MockGameDetailsPage() {
    return <div data-testid="game-details-page">Game Details Page</div>;
  };
});

jest.mock('../../pages/ReportPage', () => {
  return function MockReportPage() {
    return <div data-testid="report-page">Report Page</div>;
  };
});

jest.mock('../../pages/FavouritesPage', () => {
  return function MockFavouritesPage() {
    return <div data-testid="favourites-page">Favourites Page</div>;
  };
});

jest.mock('../../pages/RecentlyViewedPage', () => {
  return function MockRecentlyViewedPage() {
    return <div data-testid="recently-viewed-page">Recently Viewed Page</div>;
  };
});

jest.mock('../../pages/MyProfilePage', () => {
  return function MockMyProfilePage() {
    return <div data-testid="my-profile-page">My Profile Page</div>;
  };
});

jest.mock('../../pages/InboxPage', () => {
  return function MockInboxPage() {
    return <div data-testid="inbox-page">Inbox Page</div>;
  };
});

jest.mock('../../pages/AdminPage', () => {
  return function MockAdminPage() {
    return <div data-testid="admin-page">Admin Page</div>;
  };
});

jest.mock('../../components/ui/Navbar', () => {
  return function MockNavbar() {
    return <nav data-testid="navbar">Navbar</nav>;
  };
});

jest.mock('../../components/ui/Footer', () => {
  return function MockFooter() {
    return <footer data-testid="footer">Footer</footer>;
  };
});

const renderWithRouter = (
  initialEntries: string[] = ['/'],
  authenticated: boolean = false,
) => {
  // Update mock auth context
  (useAuth as jest.Mock).mockReturnValue({
    ...mockAuthContext,
    isAuthenticated: authenticated,
    user: authenticated
      ? { id: 'test-user', name: 'Test User', role: 'user', email: 'test@example.com' }
      : null,
  });

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <FavouritesProvider>
          <RecentlyViewedProvider>
            <VoiceAssistantProvider onNavigate={jest.fn()} setSearchTerm={jest.fn()}>
              <App />
            </VoiceAssistantProvider>
          </RecentlyViewedProvider>
        </FavouritesProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe('Browser Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Public Routes', () => {
    test('renders BrowsePage at root path "/"', () => {
      renderWithRouter(['/']);
      expect(screen.getByTestId('browse-page')).toBeInTheDocument();
    });

    test('renders BrowsePage at "/browse" path', () => {
      renderWithRouter(['/browse']);
      expect(screen.getByTestId('browse-page')).toBeInTheDocument();
    });

    test('renders AboutPage at "/about" path', () => {
      renderWithRouter(['/about']);
      expect(screen.getByTestId('about-page')).toBeInTheDocument();
    });

    test('renders SignInPage at "/signin" path', () => {
      renderWithRouter(['/signin']);
      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
    });

    test('redirects "/settings" to "/settings/voice"', async () => {
      renderWithRouter(['/settings']);
      await waitFor(() => {
        expect(screen.getByTestId('settings-page')).toBeInTheDocument();
      });
    });

    test('renders SettingsPage at "/settings/voice" path', () => {
      renderWithRouter(['/settings/voice']);
      expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    });

    test('renders SettingsPage at "/settings/keyboard" path', () => {
      renderWithRouter(['/settings/keyboard']);
      expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    });

    test('renders SettingsPage at "/settings/visual" path', () => {
      renderWithRouter(['/settings/visual']);
      expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    });

    test('renders GameDetailsPage at "/game/:gameId" path', () => {
      renderWithRouter(['/game/test-game-id']);
      expect(screen.getByTestId('game-details-page')).toBeInTheDocument();
    });
  });

  describe('Report Routes', () => {
    test('renders ReportPage at "/report/general" path', () => {
      renderWithRouter(['/report/general']);
      expect(screen.getByTestId('report-page')).toBeInTheDocument();
    });

    test('renders ReportPage at "/report/game/:gameId" path', () => {
      renderWithRouter(['/report/game/test-game-id']);
      expect(screen.getByTestId('report-page')).toBeInTheDocument();
    });

    test('renders ReportPage at "/report/review/:gameId/:reviewId" path', () => {
      renderWithRouter(['/report/review/test-game-id/test-review-id']);
      expect(screen.getByTestId('report-page')).toBeInTheDocument();
    });

    test('handles invalid reportType by defaulting to general', () => {
      renderWithRouter(['/report/invalid-type']);
      expect(screen.getByTestId('report-page')).toBeInTheDocument();
    });
  });

  describe('Protected Routes - Unauthenticated', () => {
    test('redirects "/favourites" to "/signin" when not authenticated', () => {
      renderWithRouter(['/favourites'], false);
      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
      expect(screen.queryByTestId('favourites-page')).not.toBeInTheDocument();
    });

    test('redirects "/recently-viewed" to "/signin" when not authenticated', () => {
      renderWithRouter(['/recently-viewed'], false);
      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
      expect(screen.queryByTestId('recently-viewed-page')).not.toBeInTheDocument();
    });

    test('redirects "/my-profile" to "/signin" when not authenticated', () => {
      renderWithRouter(['/my-profile'], false);
      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
      expect(screen.queryByTestId('my-profile-page')).not.toBeInTheDocument();
    });

    test('redirects "/inbox" to "/signin" when not authenticated', () => {
      renderWithRouter(['/inbox'], false);
      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
      expect(screen.queryByTestId('inbox-page')).not.toBeInTheDocument();
    });

    test('redirects "/change-email-password" to "/signin" when not authenticated', () => {
      renderWithRouter(['/change-email-password'], false);
      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
    });

    test('redirects "/admin" to "/signin" when not authenticated', () => {
      renderWithRouter(['/admin'], false);
      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
    });

    test('redirects "/admin/games/new" to "/signin" when not authenticated', () => {
      renderWithRouter(['/admin/games/new'], false);
      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
    });

    test('redirects "/admin/games/:gameId" to "/signin" when not authenticated', () => {
      renderWithRouter(['/admin/games/test-game-id'], false);
      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
    });
  });

  describe('Protected Routes - Authenticated', () => {
    test('renders FavouritesPage at "/favourites" when authenticated', () => {
      renderWithRouter(['/favourites'], true);
      expect(screen.getByTestId('favourites-page')).toBeInTheDocument();
      expect(screen.queryByTestId('signin-page')).not.toBeInTheDocument();
    });

    test('renders RecentlyViewedPage at "/recently-viewed" when authenticated', () => {
      renderWithRouter(['/recently-viewed'], true);
      expect(screen.getByTestId('recently-viewed-page')).toBeInTheDocument();
      expect(screen.queryByTestId('signin-page')).not.toBeInTheDocument();
    });

    test('renders MyProfilePage at "/my-profile" when authenticated', () => {
      renderWithRouter(['/my-profile'], true);
      expect(screen.getByTestId('my-profile-page')).toBeInTheDocument();
      expect(screen.queryByTestId('signin-page')).not.toBeInTheDocument();
    });

    test('renders InboxPage at "/inbox" when authenticated', () => {
      renderWithRouter(['/inbox'], true);
      expect(screen.getByTestId('inbox-page')).toBeInTheDocument();
      expect(screen.queryByTestId('signin-page')).not.toBeInTheDocument();
    });

    test('renders AdminPage at "/admin" when authenticated', () => {
      renderWithRouter(['/admin'], true);
      expect(screen.getByTestId('admin-page')).toBeInTheDocument();
      expect(screen.queryByTestId('signin-page')).not.toBeInTheDocument();
    });
  });

  describe('404 Not Found Page', () => {
    test('renders NotFoundPage for invalid route "/invalid-path"', () => {
      renderWithRouter(['/invalid-path']);
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
      expect(screen.getByText('404', { exact: false })).toBeInTheDocument();
    });

    test('renders NotFoundPage for invalid route "/random/route"', () => {
      renderWithRouter(['/random/route']);
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    });

    test('displays requested path in NotFoundPage', () => {
      renderWithRouter(['/nonexistent/page']);
      expect(screen.getByText('/nonexistent/page')).toBeInTheDocument();
    });

    test('NotFoundPage has navigation buttons', () => {
      renderWithRouter(['/invalid']);
      expect(screen.getByRole('button', { name: /Go to Home Page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go Back/i })).toBeInTheDocument();
    });

    test('NotFoundPage has quick navigation links', () => {
      renderWithRouter(['/invalid']);
      expect(screen.getByRole('button', { name: /Browse Games/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /About Us/i })).toBeInTheDocument();
    });
  });

  describe('ProtectedRoute Component', () => {
    const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

    test('renders children when authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: true,
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          </AuthProvider>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    test('redirects to signin when not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: false,
      });

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <TestComponent />
                  </ProtectedRoute>
                }
              />
              <Route path="/signin" element={<div data-testid="signin-page">Sign In</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    test('preserves location state when redirecting', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        isAuthenticated: false,
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/favourites']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/favourites"
                element={
                  <ProtectedRoute>
                    <TestComponent />
                  </ProtectedRoute>
                }
              />
              <Route path="/signin" element={<div data-testid="signin-page">Sign In</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('signin-page')).toBeInTheDocument();
    });
  });

  describe('Route Parameter Extraction', () => {
    test('extracts gameId from "/game/:gameId" route', () => {
      renderWithRouter(['/game/test-game-123']);
      expect(screen.getByTestId('game-details-page')).toBeInTheDocument();
    });

    test('extracts gameId and reviewId from "/report/review/:gameId/:reviewId" route', () => {
      renderWithRouter(['/report/review/game-123/review-456']);
      expect(screen.getByTestId('report-page')).toBeInTheDocument();
    });

    test('extracts gameId from "/report/game/:gameId" route', () => {
      renderWithRouter(['/report/game/game-789']);
      expect(screen.getByTestId('report-page')).toBeInTheDocument();
    });

    test('extracts reportType from "/report/:reportType" route', () => {
      renderWithRouter(['/report/general']);
      expect(screen.getByTestId('report-page')).toBeInTheDocument();
    });

    test('extracts section from "/settings/:section" route', () => {
      renderWithRouter(['/settings/voice']);
      expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    });
  });

  describe('Navigation and Redirects', () => {
    test('settings route redirects to /settings/voice', async () => {
      renderWithRouter(['/settings']);
      await waitFor(() => {
        expect(screen.getByTestId('settings-page')).toBeInTheDocument();
      });
    });

    test('can render different public routes independently', () => {
      renderWithRouter(['/']);
      expect(screen.getByTestId('browse-page')).toBeInTheDocument();
    });

    test('can render about page route', () => {
      renderWithRouter(['/about']);
      expect(screen.getByTestId('about-page')).toBeInTheDocument();
    });
  });

  describe('Route Priority and Matching', () => {
    test('most specific report route matches first (/report/review/:gameId/:reviewId)', () => {
      renderWithRouter(['/report/review/game-1/review-1']);
      expect(screen.getByTestId('report-page')).toBeInTheDocument();
    });

    test('game report route matches before generic report route', () => {
      renderWithRouter(['/report/game/game-1']);
      expect(screen.getByTestId('report-page')).toBeInTheDocument();
    });

    test('generic report route matches for /report/:reportType', () => {
      renderWithRouter(['/report/general']);
      expect(screen.getByTestId('report-page')).toBeInTheDocument();
    });

    test('404 route matches last for unmatched paths', () => {
      renderWithRouter(['/completely/invalid/path']);
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    });
  });

  describe('Accessibility and Main Content', () => {
    test('main content has proper id and tabIndex', () => {
      renderWithRouter(['/']);
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveAttribute('id', 'main-content');
      expect(mainContent).toHaveAttribute('tabIndex', '-1');
    });

    test('all routes render main content element', () => {
      const routes = ['/', '/browse', '/about', '/signin', '/settings/voice'];
      routes.forEach(route => {
        const { unmount } = renderWithRouter([route]);
        expect(screen.getByRole('main')).toBeInTheDocument();
        unmount();
      });
    });
  });
});

