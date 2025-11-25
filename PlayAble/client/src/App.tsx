import { useState } from 'react';
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

const PAGE_SIZE = 9;

function App() {
  const [path, setPath] = useState<AppPath>('/');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [favourites, setFavourites] = useState<Set<string>>(new Set());

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
      setPath(newPath as AppPath);
    }
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

  const handleToggleFavourite = (gameId: string) => {
    setFavourites(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  const handleGameClick = (gameId: string) => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    // later: navigate to /game/:id
    console.log('Open details for', gameId);
  };

  return (
    <div className="App">
      <Navbar
        role="user"
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        currentPath={path}
        onNavigate={handleNavigate}
      />

      <div className="App__content">
        {(path === '/' || path === '/browse') && (
          <BrowsePage
            currentPath={path}
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            searchTerm={searchTerm}
            onGameClick={handleGameClick}
            onToggleFavourite={handleToggleFavourite}
            favourites={favourites}
            onSearchChange={handleSearchChange}
          />
        )}
        {path === '/favourites' && <FavouritesPage />}
        {path === '/recently-viewed' && <RecentlyViewedPage />}
        {path === '/settings' && <SettingsPage />}
        {path === '/admin' && <AdminPage />}
        {path === '/signin' && <SignInPage />}
        {path === '/my-profile' && <MyProfilePage />}
        {path === '/inbox' && <InboxPage />}
        {path === '/about' && <AboutPage />}
        {path === '/report' && <ReportPage />}
      </div>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default App;
