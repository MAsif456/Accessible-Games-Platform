import React, { useRef, useEffect, useCallback } from 'react';
import useKeyboardNavigation from '../../hooks/navigation/useKeyboardNavigation';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const footerNavRef = useRef<HTMLUListElement>(null);

  // Get all footer navigation buttons for keyboard navigation
  const getFooterButtons = useCallback((): HTMLButtonElement[] => {
    if (!footerNavRef.current) return [];
    return Array.from(footerNavRef.current.querySelectorAll('button[type="button"]'));
  }, []);

  // Keyboard navigation for footer links
  const { handleKeyDown: handleFooterKeyDown } = useKeyboardNavigation(
    getFooterButtons(),
    { direction: 'horizontal', loop: true }
  );

  // Handle keyboard events for footer navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if focus is within footer navigation
      if (footerNavRef.current?.contains(event.target as Node)) {
        handleFooterKeyDown(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleFooterKeyDown]);

  return (
    <footer className="site-footer" role="contentinfo" aria-label="Website footer">
      <div className="site-footer__inner">
        <span className="site-footer__brand">PlayAble</span>
        <nav aria-label="Footer navigation">
          <ul className="site-footer__links" ref={footerNavRef} role="menubar">
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="site-footer__link"
                onClick={() => onNavigate && onNavigate('/about')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate && onNavigate('/about');
                  }
                }}
              >
                About Us
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="site-footer__link"
                onClick={() => onNavigate && onNavigate('/report')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate && onNavigate('/report');
                  }
                }}
              >
                Report anything to us here
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
