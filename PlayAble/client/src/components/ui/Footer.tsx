import React from 'react';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="site-footer" aria-label="Website footer">
      <div className="site-footer__inner">
        <span className="site-footer__brand">PlayAble</span>
        <nav aria-label="Footer navigation">
          <ul className="site-footer__links">
            <li>
              <button
                type="button"
                className="site-footer__link"
                onClick={() => onNavigate && onNavigate('/about')}
              >
                About Us
              </button>
            </li>
            <li>
              <button
                type="button"
                className="site-footer__link"
                onClick={() => onNavigate && onNavigate('/report')}
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
