import React from 'react';
import type { UserRole } from './Navbar';

export interface AccountMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onNavigate?: (path: string) => void;
  onRequestLogout: () => void;
}

const NavbarAccountMenu: React.FC<AccountMenuProps> = ({
  isOpen,
  onToggle,
  onNavigate,
  onRequestLogout,
}) => (
  <li className="navbar__profile">
    <div className="navbar__profile-wrapper">
      <button
        type="button"
        className="navbar__nav-button navbar__nav-button--profile"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="navbar__nav-icon navbar__nav-icon--user" aria-hidden="true" />
        <span>My Account</span>
        <span className="navbar__nav-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {isOpen && (
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
                onClick={onRequestLogout}
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
);

export default NavbarAccountMenu;
