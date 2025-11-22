import React, { useState } from 'react';

export type UserRole = 'guest' | 'user' | 'admin';

export interface NavbarProps {
  role?: UserRole;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const navItems = [
  { key: 'browse', label: 'Browse', path: '/browse', icon: 'home' },
  { key: 'recently-viewed', label: 'Recently Viewed', path: '/recently-viewed', icon: 'clock' },
  { key: 'favourites', label: 'Favourites', path: '/favourites', icon: 'heart' },
  { key: 'settings', label: 'Settings', path: '/settings', icon: 'cog' },
  { key: 'voice', label: 'Voice', path: '/voice', icon: 'mic' },
];

const Navbar: React.FC<NavbarProps> = ({
  role = 'guest',
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  currentPath = '/',
  onNavigate,
}) => {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const handleNavClick = (path: string) => {
    if (path === '/voice') {
      // Toggle voice popup instead of navigation
      setIsVoiceOpen((prev) => !prev);
      return;
    }
    if (onNavigate) onNavigate(path);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSearchSubmit();
    }
  };

  const isLoggedIn = role === 'user' || role === 'admin';

  return (
    <header className="navbar" aria-label="Main navigation">
      <div className="navbar__inner">
        <div className="navbar__brand" onClick={() => handleNavClick('/')}
          role="button" tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleNavClick('/');
          }}
        >
          <div className="navbar__logo" aria-hidden="true">
            <img src="/src/assets/branding/playable-app-logo-branding.png" alt="PlayAble Logo" style={{ width: '60px', height: '50px', borderRadius: '12px' }} />
          </div>
          <span className="navbar__title">PlayAble</span>
        </div>

        <div className="navbar__search" role="search">
          <label htmlFor="global-search" className="sr-only">
            Search games
          </label>
          <div className="navbar__search-input-wrapper">
            <input
              id="global-search"
              type="search"
              className="navbar__search-input"
              placeholder="Search games..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchTerm && (
              <button
                type="button"
                className="navbar__search-clear"
                onClick={onClearSearch}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <nav className="navbar__nav" aria-label="Primary">
          <ul className="navbar__nav-list">
            {navItems.map((item) => {
              const isActive = currentPath === item.path || (item.key === 'browse' && currentPath === '/');
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.path)}
                    className={
                      'navbar__nav-button' +
                      (item.key === 'voice' ? ' navbar__nav-button--voice' : '') +
                      (isActive ? ' navbar__nav-button--primary' : '')
                    }
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span
                      className={`navbar__nav-icon navbar__nav-icon--${item.icon}`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}

            {role === 'admin' && (
              <li>
                <button
                  type="button"
                  onClick={() => handleNavClick('/admin')}
                  className="navbar__nav-button"
                >
                  <span
                    className="navbar__nav-icon navbar__nav-icon--admin"
                    aria-hidden="true"
                  />
                  <span>Admin</span>
                </button>
              </li>
            )}

            {isLoggedIn ? (
              <li className="navbar__profile">
                <div className="navbar__profile-wrapper">
                  <button
                    type="button"
                    className="navbar__nav-button navbar__nav-button--profile"
                    aria-haspopup="menu"
                    aria-expanded={isAccountOpen}
                    onClick={() => setIsAccountOpen((prev) => !prev)}
                  >
                    <span
                      className="navbar__nav-icon navbar__nav-icon--user"
                      aria-hidden="true"
                    />
                    <span>My Account</span>
                    <span className="navbar__nav-caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  {isAccountOpen && (
                    <div className="navbar__profile-menu" role="menu" aria-label="My Account menu">
                      <div className="navbar__profile-menu-header">My Account</div>
                      <ul className="navbar__profile-menu-list">
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className="navbar__profile-menu-item"
                            onClick={() => onNavigate && onNavigate('/my-profile')}
                          >
                            <span
                              className="navbar__profile-menu-icon navbar__nav-icon--user"
                              aria-hidden="true"
                            />
                            <span>Profile</span>
                          </button>
                        </li>
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className="navbar__profile-menu-item"
                            onClick={() => onNavigate && onNavigate('/inbox')}
                          >
                            <span
                              className="navbar__profile-menu-icon navbar__nav-icon--inbox"
                              aria-hidden="true"
                            />
                            <span>Inbox</span>
                            <span className="navbar__profile-menu-dot" aria-hidden="true" />
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </li>
            ) : (
              <li>
                <button
                  type="button"
                  onClick={() => handleNavClick('/signin')}
                  className="navbar__nav-button navbar__nav-button--signin"
                >
                  <span
                    className="navbar__nav-icon navbar__nav-icon--lock"
                    aria-hidden="true"
                  />
                  <span>Sign in</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
      {isVoiceOpen && (
        <div className="voice-popup" aria-label="Voice listening popup">
          {/* Empty placeholder popup for future implementation */}
        </div>
      )}
    </header>
  );
};

export default Navbar;
