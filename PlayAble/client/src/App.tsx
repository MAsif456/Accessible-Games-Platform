import { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/ui/Navbar';
import Footer from './components/ui/Footer';
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

// Protected pages that require authentication
const protectedPaths: AppPath[] = [
  '/favourites',
  '/recently-viewed',
  '/my-profile',
  '/inbox',
];

function AppContent() {
  const { user, isAuthenticated, logout } = useAuth();
  const [path, setPath] = useState<AppPath>('/');
  const [searchTerm, setSearchTerm] = useState('');
  const [prompt, setPrompt] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const promptTimeout = useRef<NodeJS.Timeout | null>(null);
  // Track if last auth event was signup or login
  const lastAuthEvent = useRef<'signup' | 'login' | null>(null);

  // Show a prompt for a short duration
  const showPrompt = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setPrompt({ message, type });
    if (promptTimeout.current) clearTimeout(promptTimeout.current);
    promptTimeout.current = setTimeout(() => setPrompt(null), 2500);
  }, []);

  const handleNavigate = (newPath: string) => {
    // Type guard to ensure newPath is a valid AppPath
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
      // Check if trying to access protected route without authentication
      if (protectedPaths.includes(newPath) && !isAuthenticated) {
        setPath('/signin');
        return;
      }

      if (newPath === '/signin') {
        lastAuthEvent.current = null; // reset on manual nav
      }

      setPath(newPath);
    }
  };

  // Custom logout handler: log out and go to home page
  const handleLogout = async () => {
    await logout();
    setPath('/');
    showPrompt('You Have Logged Out Successfully', 'success');
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // TODO: trigger search filtering here
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    // TODO: reset search results here
  };

  // Get user role for navbar
  const userRole = user?.role || 'guest';

  // Listen for signup/login event from SignInPage
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
        {(path === '/' || path === '/browse') && <BrowsePage />}
        {path === '/favourites' && <FavouritesPage />}
        {path === '/recently-viewed' && <RecentlyViewedPage />}
        {path === '/settings' && <SettingsPage />}
        {path === '/admin' && <AdminPage />}
        {path === '/signin' && (
          <SignInPage
            onNavigate={handleNavigate}
            showPrompt={(msg, type) => {
              // If the prompt is a signup welcome, set the flag
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