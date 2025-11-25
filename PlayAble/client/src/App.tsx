import { useState } from 'react';
import SkipLink from './components/navigation/SkipLink';
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

function App() {
  const [path, setPath] = useState<AppPath>('/');  const [searchTerm, setSearchTerm] = useState('');

  // Enable global keyboard navigation for the entire app
  useGlobalKeyboardNavigation();

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
  return (
    <div className="App">
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <Navbar
        role="user"
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchSubmit={() => {}}
        onClearSearch={handleClearSearch}
        currentPath={path}
        onNavigate={handleNavigate}
      />

      <div className="App__content">
        <main id="main-content" tabIndex={-1}>
          {(path === '/' || path === '/browse') && <BrowsePage />}
          {path === '/favourites' && <FavouritesPage />}
          {path === '/recently-viewed' && <RecentlyViewedPage />}
          {path === '/settings' && <SettingsPage />}
          {path === '/admin' && <AdminPage />}
          {path === '/signin' && <SignInPage />}
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

export default App;

