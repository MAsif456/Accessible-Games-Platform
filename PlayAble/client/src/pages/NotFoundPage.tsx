import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AppPath } from '../App';

interface NotFoundPageProps {
  onNavigate?: (path: AppPath) => void;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoHome = () => {
    if (onNavigate) {
      onNavigate('/');
    } else {
      navigate('/');
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      handleGoHome();
    }
  };

  return (
    <main className="not-found-page" aria-label="Page not found">
      <div className="not-found-page__container">
        <div className="not-found-page__content">
          <h1 className="not-found-page__title">
            <span className="not-found-page__code" aria-hidden="true">404</span>
            <span className="not-found-page__heading">Page Not Found</span>
          </h1>
          
          <p className="not-found-page__message">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          {location.pathname && location.pathname !== '/' && (
            <div className="not-found-page__path-info">
              <p className="not-found-page__path-label">Requested path:</p>
              <code className="not-found-page__path">{location.pathname}</code>
            </div>
          )}

          <div className="not-found-page__actions">
            <button
              type="button"
              className="not-found-page__button not-found-page__button--primary"
              onClick={handleGoHome}
            >
              Go to Home Page
            </button>
            <button
              type="button"
              className="not-found-page__button not-found-page__button--secondary"
              onClick={handleGoBack}
            >
              Go Back
            </button>
          </div>

          <nav className="not-found-page__links" aria-label="Quick navigation">
            <p className="not-found-page__links-label">Or try one of these:</p>
            <ul className="not-found-page__links-list">
              <li>
                <button
                  type="button"
                  className="not-found-page__link"
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('/browse');
                    } else {
                      navigate('/browse');
                    }
                  }}
                >
                  Browse Games
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="not-found-page__link"
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('/about');
                    } else {
                      navigate('/about');
                    }
                  }}
                >
                  About Us
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </main>
  );
};

export default NotFoundPage;

