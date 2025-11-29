import { useState, useEffect, useRef, useCallback } from 'react';
import SkipLink from './components/navigation/SkipLink';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavouritesProvider } from './context/FavouritesContext';
import Navbar from './components/ui/Navbar';
import Footer from './components/ui/Footer';
import { useGlobalKeyboardNavigation } from './hooks/useGlobalKeyboardNavigation';
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
import GameDetailsPage from './pages/GameDetailsPage';
import ReportPage from './pages/ReportPage';
/// ok 
export type AppPath =
  | '/'
  | '/browse'
  | '/game-details'
  | '/favourites'
  | '/recently-viewed'
  | '/settings'
  | '/admin'
  | '/signin'
  | '/my-profile'
  | '/change-email-password'
  | '/inbox'
  | '/about'
  | '/report/general'
  | '/report/game'
  | '/report/review';

const PAGE_SIZE = 9;
const protectedPaths: AppPath[] = [
  '/favourites',
  '/recently-viewed',
  '/my-profile',
  '/inbox',
  '/change-email-password',
];

function App() {
  return (
    <AuthProvider>
      <FavouritesProvider>
        <AppContent PAGE_SIZE={PAGE_SIZE} protectedPaths={protectedPaths} />
      </FavouritesProvider>
    </AuthProvider>
  );
}

function AppContent({ PAGE_SIZE, protectedPaths }: { PAGE_SIZE: number; protectedPaths: AppPath[] }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [path, setPath] = useState<AppPath>('/');
  const [previousPath, setPreviousPath] = useState<AppPath | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'general' | 'game' | 'review' | null>(null);
  const [reportGameId, setReportGameId] = useState<string | undefined>(undefined);
  const [reportReviewId, setReportReviewId] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [prompt, setPrompt] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const promptTimeout = useRef<number | null>(null);
  const lastAuthEvent = useRef<'signup' | 'login' | null>(null);

  // Enable global keyboard navigation for the entire app
  useGlobalKeyboardNavigation();

  const showPrompt = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setPrompt({ message, type });
    if (promptTimeout.current !== null) window.clearTimeout(promptTimeout.current);
    promptTimeout.current = window.setTimeout(() => setPrompt(null), 2500);
  }, []);

  const handleNavigate = (newPath: string) => {
    if (
      newPath === '/' ||
      newPath === '/browse' ||
      newPath === '/game-details' ||
      newPath === '/favourites' ||
      newPath === '/recently-viewed' ||
      newPath === '/settings' ||
      newPath === '/admin' ||
      newPath === '/signin' ||
      newPath === '/my-profile' ||
      newPath === '/change-email-password' ||
      newPath === '/inbox' ||
      newPath === '/about' ||
      newPath === '/report/general' ||
      newPath === '/report/game' ||
      newPath === '/report/review'
    ) {
      const typedPath = newPath as AppPath;

      if (typedPath !== path) {
        setPreviousPath(path);
      }

      // Only reset state when explicitly going to the general report page
      if (typedPath === '/report/general') {
        setReportType('general');
        setReportGameId(undefined);
        setReportReviewId(undefined);
      }

      // Check if trying to access protected route without authentication
      if (protectedPaths.includes(typedPath) && !isAuthenticated) {
        setPath('/signin');
        return;
      }

      if (typedPath === '/signin') {
        lastAuthEvent.current = null; // reset on manual nav
      }

      setPath(typedPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper functions to open specific report modes with context ids
  const openGameReport = (gameId: string) => {
    setReportType('game');
    setReportGameId(gameId);
    setReportReviewId(undefined);
    handleNavigate('/report/game');
  };

  const openReviewReport = (reviewId: string, gameId: string) => {
    setReportType('review');
    setReportGameId(gameId);
    setReportReviewId(reviewId);
    handleNavigate('/report/review');
  };


  (window as any).appNavigate = handleNavigate;
  (window as any).openGameReport = openGameReport;
  (window as any).openReviewReport = openReviewReport;

  const handleLogout = async () => {
    await logout();
    setPath('/');
    showPrompt('You Have Logged Out Successfully', 'success');
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSearchSubmit = () => {
    setPath('/browse');
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleGameClick = (gameId: string) => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setSelectedGameId(gameId);
    handleNavigate('/game-details');
  };

  const handleGameDetailsBack = () => {
    if (previousPath) {
      setPath(previousPath);
      return;
    }
    setPath('/browse');
  };

  const userRole = user?.role || 'guest';
  const handleReportBack = () => {
    if (previousPath) {
      setPath(previousPath);
      return;
    }
    setPath('/');
  };

  useEffect(() => {
    if (lastAuthEvent.current === 'signup' && user) {
      showPrompt(`Welcome to Accessible Games Platform, ${user.name || 'user'}!`, 'success');
      lastAuthEvent.current = null;
    } else if (lastAuthEvent.current === 'login' && user) {
      showPrompt(`Welcome Back, ${user.name || user.email || 'user'}!`, 'success');
      lastAuthEvent.current = null;
    }
  }, [user, showPrompt]);

  let content: React.ReactNode = null;

  switch (path) {
    case '/report/general':
    case '/report/game':
    case '/report/review':
      content = (
        <ReportPage
          onShowToast={showPrompt}
          initialType={reportType || 'general'}
          initialGameId={reportGameId}
          initialReviewId={reportReviewId}
          onBack={handleReportBack}
        />
      );
      break;
    default:
      content = (
        <main id="main-content" tabIndex={-1}>
          {(path === '/' || path === '/browse') && (
            <BrowsePage
              currentPath={path}
              currentPage={currentPage}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
              searchTerm={searchTerm}
              onGameClick={handleGameClick}
              onSearchChange={handleSearchChange}
            />
          )}

          {path === '/game-details' && selectedGameId && (
            <GameDetailsPage
              gameId={selectedGameId}
              onBack={handleGameDetailsBack}
              onNavigate={handleNavigate}
              onOpenGameReport={openGameReport}
              onOpenReviewReport={openReviewReport}
            />
          )}

          {path === '/favourites' && <FavouritesPage onNavigate={handleNavigate} />}
          {path === '/recently-viewed' && <RecentlyViewedPage />}
          {path === '/settings' && <SettingsPage />}
          {path === '/admin' && <AdminPage />}
          {path === '/signin' && (
            <SignInPage
              onNavigate={handleNavigate}
              showPrompt={(msg, type) => {
                if (msg && msg.startsWith('Welcome to Accessible Games Platform')) {
                  lastAuthEvent.current = 'signup';
                } else if (msg && msg === 'Login successful!') {
                  lastAuthEvent.current = 'login';
                }
                showPrompt(msg, type);
              }}
            />
          )}
          {path === '/my-profile' && <MyProfilePage onNavigate={handleNavigate} onLogout={handleLogout} />}
          {path === '/change-email-password' && <ChangeEmailPasswordPage onNavigate={handleNavigate} />}
          {path === '/inbox' && <InboxPage />}
          {path === '/about' && <AboutPage />}
        </main>
      );
  }

  return (
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
        currentPath={path}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <div className="App__content">{content}</div>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default App;
