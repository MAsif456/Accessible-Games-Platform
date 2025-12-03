import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, useSearchParams, Outlet, Navigate } from 'react-router-dom';
import SkipLink from './components/navigation/SkipLink';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavouritesProvider } from './context/FavouritesContext';
import { VoiceAssistantProvider } from './context/VoiceAssistantContext';
import { RecentlyViewedProvider } from './context/RecentlyViewedContext';
import Navbar from './components/ui/Navbar';
import Footer from './components/ui/Footer';
import { useGlobalKeyboardNavigation } from './hooks/useGlobalKeyboardNavigation';
import ProtectedRoute from './components/routing/ProtectedRoute';
import BrowsePage from './pages/BrowsePage';
import FavouritesPage from './pages/FavouritesPage';
import RecentlyViewedPage from './pages/RecentlyViewedPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import SignInPage from './pages/SignInPage';
import MyProfilePage from './pages/MyProfilePage';
import InboxPage from './pages/InboxPage';
import AboutPage from './pages/AboutPage';
import ChangeEmailPasswordPage from './pages/ChangeEmailPasswordPage';
import AdminGameFormPage from './pages/AdminGameFormPage';
import GameDetailsPage from './pages/GameDetailsPage';
import ReportPage from './pages/ReportPage';
import NotFoundPage from './pages/NotFoundPage';

export type AppPath = string;

const PAGE_SIZE = 9;

function App() {
  return (
    <AuthProvider>
      <FavouritesProvider>
        <RecentlyViewedProvider>
          <AppContent PAGE_SIZE={PAGE_SIZE} />
        </RecentlyViewedProvider>
      </FavouritesProvider>
    </AuthProvider>
  );
}

function AppContent({ PAGE_SIZE }: { PAGE_SIZE: number }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [prompt, setPrompt] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const promptTimeout = useRef<number | null>(null);
  const lastAuthEvent = useRef<'signup' | 'login' | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Enable global keyboard navigation
  useGlobalKeyboardNavigation();

  // Get search term and page from URL
  const searchTerm = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const showPrompt = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setPrompt({ message, type });
    if (promptTimeout.current !== null) window.clearTimeout(promptTimeout.current);
    promptTimeout.current = window.setTimeout(() => setPrompt(null), 2500);
  }, []);

  // Navigation helper that uses React Router
  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    // Scroll is handled by useEffect on location change
  }, [navigate]);

  // Report helpers that use URL parameters
  const openGameReport = useCallback((gameId: string) => {
    navigate(`/report/game/${gameId}`);
  }, [navigate]);

  const openReviewReport = useCallback((reviewId: string, gameId: string) => {
    navigate(`/report/review/${gameId}/${reviewId}`);
  }, [navigate]);

  // Game click handler
  const handleGameClick = useCallback((gameId: string) => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    navigate(`/game/${gameId}`);
  }, [navigate]);

  // Search handlers
  const handleSearchChange = useCallback((value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    newParams.delete('page'); // Reset to page 1 when searching
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleSearchSubmit = useCallback(() => {
    navigate('/browse');
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', '1');
    setSearchParams(newParams);
  }, [navigate, searchParams, setSearchParams]);

  const handleClearSearch = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    newParams.set('page', '1');
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handlePageChange = useCallback((page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/');
    showPrompt('You Have Logged Out Successfully', 'success');
  }, [logout, navigate, showPrompt]);

  // Expose navigation functions globally for voice assistant and other uses
  useEffect(() => {
    (window as any).appNavigate = handleNavigate;
    (window as any).openGameReport = openGameReport;
    (window as any).openReviewReport = openReviewReport;
  }, [handleNavigate, openGameReport, openReviewReport]);

  // Handle auth events
  useEffect(() => {
    if (lastAuthEvent.current === 'signup' && user) {
      showPrompt(`Welcome to Accessible Games Platform, ${user.name || 'user'}!`, 'success');
      lastAuthEvent.current = null;
    } else if (lastAuthEvent.current === 'login' && user) {
      showPrompt(`Welcome Back, ${user.name || user.email || 'user'}!`, 'success');
      lastAuthEvent.current = null;
    }
  }, [user, showPrompt]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const userRole = user?.role || 'guest';

  // Wrapper for SignInPage to handle auth events
  const SignInPageWrapper = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from?.pathname || '/browse';

    return (
      <SignInPage
        onNavigate={(path) => {
          // If navigating after login/signup, use the redirect destination
          if (path === '/browse' && lastAuthEvent.current) {
            navigate(from, { replace: true });
          } else {
            handleNavigate(path);
          }
        }}
        showPrompt={(msg, type) => {
          if (msg && msg.startsWith('Welcome to Accessible Games Platform')) {
            lastAuthEvent.current = 'signup';
          } else if (msg && (msg.startsWith('Welcome Back') || msg === 'Login successful!')) {
            lastAuthEvent.current = 'login';
            // Redirect to intended destination after login
            setTimeout(() => {
              navigate(from, { replace: true });
            }, 1000);
          }
          showPrompt(msg, type);
        }}
      />
    );
  };

  // Game Details wrapper to extract gameId from URL
  const GameDetailsWrapper = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    if (!gameId) {
      navigate('/browse');
      return null;
    }

    const handleBack = () => {
      // Try to go back, or navigate to browse
      if (location.key !== 'default') {
        navigate(-1);
      } else {
        navigate('/browse');
      }
    };

    return (
      <GameDetailsPage
        gameId={gameId}
        onBack={handleBack}
        onNavigate={handleNavigate}
        onOpenGameReport={openGameReport}
        onOpenReviewReport={openReviewReport}
      />
    );
  };

  // Report Page wrapper to extract params from URL
  const ReportPageWrapper = () => {
    const { reportType, gameId, reviewId } = useParams<{
      reportType?: string;
      gameId?: string;
      reviewId?: string;
    }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Infer report type from URL path if reportType param is not present
    // Validate that reportType is one of the valid values
    const validReportTypes = ['general', 'game', 'review'] as const;
    type ValidReportType = typeof validReportTypes[number];
    
    let type: ValidReportType = 'general';
    if (reportType && validReportTypes.includes(reportType as ValidReportType)) {
      type = reportType as ValidReportType;
    } else if (location.pathname.startsWith('/report/review/')) {
      type = 'review';
    } else if (location.pathname.startsWith('/report/game/')) {
      type = 'game';
    }

    const handleBack = () => {
      if (location.key !== 'default') {
        navigate(-1);
      } else {
        navigate('/');
      }
    };

    return (
      <ReportPage
        onShowToast={showPrompt}
        initialType={type}
        initialGameId={gameId}
        initialReviewId={reviewId}
        onBack={handleBack}
      />
    );
  };

  // Admin Game Form wrapper
  const AdminGameFormWrapper = ({ mode }: { mode: 'create' | 'edit' }) => {
    const { gameId } = useParams<{ gameId?: string }>();
    
    if (mode === 'edit' && !gameId) {
      navigate('/admin');
      return null;
    }

    return (
      <AdminGameFormPage
        mode={mode}
        gameId={gameId}
        onNavigate={handleNavigate}
        showPrompt={showPrompt}
      />
    );
  };

  return (
    <VoiceAssistantProvider onNavigate={handleNavigate} setSearchTerm={handleSearchChange}>
      <div className="App">
        <SkipLink href="#main-content">Skip to main content</SkipLink>

        {prompt && (
          <div
            style={{
              position: 'fixed',
              left: 24,
              bottom: 24,
              zIndex: 1000,
              background: '#fff',
              color: '#111827',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              padding: '1rem 1.5rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 220,
              borderLeft: prompt.type === 'success' ? '4px solid #22c55e' : '4px solid #ef4444',
              animation: 'fadeIn 0.2s',
            }}
            role="status"
            aria-live="polite"
          >
            <span aria-hidden="true">{prompt.type === 'success' ? '●' : '⚠️'}</span>
            <span>{prompt.message}</span>
          </div>
        )}

        <Navbar
          role={userRole}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onClearSearch={handleClearSearch}
          currentPath={location.pathname}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          unreadNotificationCount={unreadNotificationCount}
        />

        <div className="App__content">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={
              <main id="main-content" tabIndex={-1}>
                <BrowsePage
                  currentPath="/"
                  currentPage={currentPage}
                  pageSize={PAGE_SIZE}
                  onPageChange={handlePageChange}
                  searchTerm={searchTerm}
                  onGameClick={handleGameClick}
                  onSearchChange={handleSearchChange}
                />
              </main>
            } />
            <Route path="/browse" element={
              <main id="main-content" tabIndex={-1}>
                <BrowsePage
                  currentPath="/browse"
                  currentPage={currentPage}
                  pageSize={PAGE_SIZE}
                  onPageChange={handlePageChange}
                  searchTerm={searchTerm}
                  onGameClick={handleGameClick}
                  onSearchChange={handleSearchChange}
                />
              </main>
            } />
            <Route path="/game/:gameId" element={
              <main id="main-content" tabIndex={-1}>
                <GameDetailsWrapper />
              </main>
            } />
            <Route path="/about" element={
              <main id="main-content" tabIndex={-1}>
                <AboutPage onNavigate={handleNavigate} />
              </main>
            } />
            <Route path="/signin" element={
              <main id="main-content" tabIndex={-1}>
                <SignInPageWrapper />
              </main>
            } />
            <Route path="/settings" element={
              <main id="main-content" tabIndex={-1}>
                <Navigate to="/settings/voice" replace />
              </main>
            } />
            <Route path="/settings/:section" element={
              <main id="main-content" tabIndex={-1}>
                <SettingsPage />
              </main>
            } />

            {/* Report routes - order matters: most specific first */}
            <Route path="/report/review/:gameId/:reviewId" element={
              <main id="main-content" tabIndex={-1}>
                <ReportPageWrapper />
              </main>
            } />
            <Route path="/report/game/:gameId" element={
              <main id="main-content" tabIndex={-1}>
                <ReportPageWrapper />
              </main>
            } />
            <Route path="/report/:reportType" element={
              <main id="main-content" tabIndex={-1}>
                <ReportPageWrapper />
              </main>
            } />

            {/* Protected routes */}
            <Route path="/favourites" element={
              <ProtectedRoute>
                <main id="main-content" tabIndex={-1}>
                  <FavouritesPage onNavigate={handleNavigate} onGameClick={handleGameClick} />
                </main>
              </ProtectedRoute>
            } />
            <Route path="/recently-viewed" element={
              <ProtectedRoute>
                <main id="main-content" tabIndex={-1}>
                  <RecentlyViewedPage onNavigate={handleNavigate} onGameClick={handleGameClick} />
                </main>
              </ProtectedRoute>
            } />
            <Route path="/my-profile" element={
              <ProtectedRoute>
                <main id="main-content" tabIndex={-1}>
                  <MyProfilePage onNavigate={handleNavigate} onLogout={handleLogout} />
                </main>
              </ProtectedRoute>
            } />
            <Route path="/inbox" element={
              <ProtectedRoute>
                <main id="main-content" tabIndex={-1}>
                  <InboxPage
                    onNavigate={handleNavigate}
                    onOpenGameReport={openGameReport}
                    onOpenReviewReport={openReviewReport}
                    onUnreadCountChange={setUnreadNotificationCount}
                  />
                </main>
              </ProtectedRoute>
            } />
            <Route path="/change-email-password" element={
              <ProtectedRoute>
                <main id="main-content" tabIndex={-1}>
                  <ChangeEmailPasswordPage onNavigate={handleNavigate} />
                </main>
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <main id="main-content" tabIndex={-1}>
                  <AdminPage onNavigate={handleNavigate} showPrompt={showPrompt} />
                </main>
              </ProtectedRoute>
            } />
            <Route path="/admin/games/new" element={
              <ProtectedRoute>
                <main id="main-content" tabIndex={-1}>
                  <AdminGameFormWrapper mode="create" />
                </main>
              </ProtectedRoute>
            } />
            <Route path="/admin/games/:gameId" element={
              <ProtectedRoute>
                <main id="main-content" tabIndex={-1}>
                  <AdminGameFormWrapper mode="edit" />
                </main>
              </ProtectedRoute>
            } />

            {/* 404 fallback - must be last route */}
            <Route path="*" element={
              <main id="main-content" tabIndex={-1}>
                <NotFoundPage onNavigate={handleNavigate} />
              </main>
            } />
          </Routes>
        </div>

        <Footer onNavigate={handleNavigate} />
      </div>
    </VoiceAssistantProvider>
  );              
}

export default App;
