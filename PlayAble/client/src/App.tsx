import { useState } from 'react';
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
  const { user, isAuthenticated } = useAuth();
  const [path, setPath] = useState<AppPath>('/');
  const [searchTerm, setSearchTerm] = useState('');

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
      
      setPath(newPath);
    }
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

  return (
    <div className="App">
      <Navbar
        role={userRole}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchSubmit={() => {}}
        onClearSearch={handleClearSearch}
        currentPath={path}
        onNavigate={handleNavigate}
      />

      <div className="App__content">
        {(path === '/' || path === '/browse') && <BrowsePage />}
        {path === '/favourites' && <FavouritesPage />}
        {path === '/recently-viewed' && <RecentlyViewedPage />}
        {path === '/settings' && <SettingsPage />}
        {path === '/admin' && <AdminPage />}
        {path === '/signin' && <SignInPage onNavigate={handleNavigate} />}
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