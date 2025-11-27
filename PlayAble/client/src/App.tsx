import { useState, useEffect, useRef, useCallback } from 'react';
import SkipLink from './components/navigation/SkipLink';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import ReportPage from './pages/ReportPage';

export type AppPath =
  | '/'
  | '/browse'
  | '/favourites'
  | '/recently-viewed'
  | '/settings'
  | '/admin'
  | '/signin'
  | '/my-profile'
  | '/inbox'
  | '/about'
  | '/report';

const protectedPaths: AppPath[] = ['/favourites', '/recently-viewed', '/my-profile', '/inbox'];

function AppContent() {
  const { user, isAuthenticated, logout } = useAuth();
  const [path, setPath] = useState<AppPath>('/');
  const [searchTerm, setSearchTerm] = useState('');
  const [prompt, setPrompt] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const promptTimeout = useRef<number | null>(null);
  const lastAuthEvent = useRef<'signup' | 'login' | null>(null);

  // Enable global keyboard navigation for the entire app
  useGlobalKeyboardNavigation();

  const showPrompt = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setPrompt({ message, type });
    if (promptTimeout.current) window.clearTimeout(promptTimeout.current);
    promptTimeout.current = window.setTimeout(() => setPrompt(null), 2500);
  }, []);

  const handleNavigate = (newPath: string) => {
    if (
      newPath === '/' ||
      newPath === '/browse' ||
      newPath === '/favourites' ||
      newPath === '/recently-viewed' ||
      newPath === '/settings' ||
      newPath === '/admin' ||
      newPath === '/signin' ||
      newPath === '/my-profile' ||
      newPath === '/inbox' ||
      newPath === '/about' ||
      newPath === '/report'
    ) {
      const typed = newPath as AppPath;
      if (protectedPaths.includes(typed) && !isAuthenticated) {
        setPath('/signin');
        return;
      }
      if (typed === '/signin') {
        lastAuthEvent.current = null;
      }
      setPath(typed);
    }
  };

  const handleLogout = async () => {
    await logout();
    setPath('/');
    showPrompt('You Have Logged Out Successfully', 'success');
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const userRole = user?.role || 'guest';

  useEffect(() => {
    if (lastAuthEvent.current === 'signup' && user) {
      showPrompt(`Welcome to Accessible Games Platform, ${user.name || 'user'}!`, 'success');
      lastAuthEvent.current = null;
    } else if (lastAuthEvent.current === 'login' && user) {
      showPrompt(`Welcome Back, ${user.name || user.email || 'user'}!`, 'success');
      lastAuthEvent.current = null;
    }
  }, [user, showPrompt]);

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
        onSearchSubmit={() => {}}
        onClearSearch={handleClearSearch}
        currentPath={path}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <div className="App__content">
        <main id="main-content" tabIndex={-1}>
          {(path === '/' || path === '/browse') && <BrowsePage />}
          {path === '/favourites' && <FavouritesPage />}
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
          {path === '/my-profile' && <MyProfilePage />}
          {path === '/inbox' && <InboxPage />}
          {path === '/about' && <AboutPage />}
          {path === '/report' && <ReportPage />}
        </main>
      </div>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;