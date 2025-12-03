import React, { useRef, useEffect, useCallback } from 'react';
import useKeyboardNavigation from '../../hooks/navigation/useKeyboardNavigation';

/**
 * Props for the Footer component.
 */
interface FooterProps {
  /** Callback function to handle navigation */
  onNavigate?: (path: string) => void;
}

/**
 * Footer component with keyboard-navigable links.
 * @param {FooterProps} props - Props for the footer component.
 * @returns {JSX.Element} - Rendered footer component.
 */
const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  // Reference to the footer navigation element
  const footerNavRef = useRef<HTMLUListElement>(null);

  /**
   * Collects footer buttons for roving focus in horizontal navigation.
   * @returns {HTMLButtonElement[]} - Array of footer buttons.
   */
  const getFooterButtons = useCallback((): HTMLButtonElement[] => {
    if (!footerNavRef.current) return [];
    return Array.from(footerNavRef.current.querySelectorAll('button[type="button"]'));
  }, []);

  // Keyboard navigation for footer links
  const { handleKeyDown: handleFooterKeyDown } = useKeyboardNavigation(
    getFooterButtons(),
    { direction: 'horizontal', loop: true }
  );

  // Attach global handler to support focus within footer.
  useEffect(() => {
    /**
     * Handles keydown events to support keyboard navigation within the footer.
     * @param {KeyboardEvent} event - The keyboard event.
     */
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
                onClick={() => onNavigate && onNavigate('/report/general')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate && onNavigate('/report/general');
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