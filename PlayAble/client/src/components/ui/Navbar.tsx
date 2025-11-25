// Navbar.tsx
// Main navigation bar for the PlayAble platform, providing access to all key pages and user account actions.
// Accessibility is prioritised: keyboard navigation, ARIA roles, and high-contrast support are included to meet WCAG 2.1 AA standards.
// The logout action uses a confirmation dialog to prevent accidental sign-outs, improving user experience for all users.
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
  onLogout?: () => void;
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
  onLogout,
}) => {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleNavClick = (path: string) => {
    if (path === '/voice') {
      setIsVoiceOpen(prev => !prev);
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
        <div
          className="navbar__brand"
          onClick={() => handleNavClick('/')}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') handleNavClick('/');
          }}
        >
          <div className="navbar__logo" aria-hidden="true">
            <img
              src="/src/assets/branding/playable-app-logo-branding.png"
              alt="PlayAble Logo"
              style={{ width: '60px', height: '50px', borderRadius: '12px' }}
            />
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
              className="navbar__search-input navbar__search-input--wide"
              placeholder="Search games..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {searchTerm && (
              <button
                type="button"
                className="navbar__search-clear navbar__search-clear--full"
                onClick={onClearSearch}
              >
                <span aria-hidden="true" className="browse-page__search-clear-icon">
                  ×
                </span>
                <span className="browse-page__search-clear-label">Clear</span>
              </button>
            )}
          </div>
          <div className="navbar__search-error" aria-live="polite"></div>
        </div>

        <nav className="navbar__nav" aria-label="Primary">
          <ul className="navbar__nav-list">
            {navItems.map(item => {
              const isActive =
                currentPath === item.path || (item.key === 'browse' && currentPath === '/');
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
                  <span className="navbar__nav-icon navbar__nav-icon--admin" aria-hidden="true" />
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
                    onClick={() => setIsAccountOpen(prev => !prev)}
                  >
                    <span className="navbar__nav-icon navbar__nav-icon--user" aria-hidden="true" />
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
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className="navbar__profile-menu-item"
                            onClick={() => setShowLogoutConfirm(true)}
                          >
                            <span
                              className="navbar__profile-menu-icon navbar__nav-icon--lock"
                              aria-hidden="true"
                            />
                            <span>Log out</span>
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
                  <span className="navbar__nav-icon navbar__nav-icon--lock" aria-hidden="true" />
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
      {showLogoutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
          aria-describedby="logout-dialog-desc"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              padding: '2.5rem 2.5rem 2rem',
              minWidth: 340,
              maxWidth: '90vw',
              textAlign: 'center',
            }}
          >
            <h2 id="logout-dialog-title" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 8 }}>
              Are you sure you want to log out?
            </h2>
            <p id="logout-dialog-desc" style={{ color: '#6b7280', marginBottom: 32 }}>
              This will end your session and log you out of your account.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: '0.7rem 2.2rem',
                  borderRadius: 12,
                  border: '2px solid #d1d5db',
                  background: '#fff',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  marginRight: 8,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  if (onLogout) await onLogout();
                }}
                style={{
                  padding: '0.7rem 2.2rem',
                  borderRadius: 12,
                  border: 'none',
                  background: '#11111f',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
