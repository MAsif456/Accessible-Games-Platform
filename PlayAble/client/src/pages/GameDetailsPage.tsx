import React, { useEffect, useMemo, useState } from 'react';
import { GameDto, getGames, getReviews, postReview, ReviewDto, toggleReviewLike } from '../services/api';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

interface GameDetailsPageProps {
  gameId: string;
  onBack: () => void;
  onReportReview?: (reviewId: string) => void;
}

// Simple model fetch using existing getGames API (no new backend needed)
async function fetchGameById(gameId: string): Promise<GameDto | null> {
  const pageSize = 100;
  const data = await getGames({ page: 1, pageSize });
  return data.games.find(g => g.id === gameId) ?? null;
}

interface ExternalTarget {
  platform: 'app-store' | 'play-store';
  url: string;
}

const GameDetailsPage: React.FC<GameDetailsPageProps> = ({ gameId, onBack, onReportReview }) => {
  const { user, isAuthenticated } = useAuth();

  const [game, setGame] = useState<GameDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [externalTarget, setExternalTarget] = useState<ExternalTarget | null>(null);
  const [writtenReview, setWrittenReview] = useState('');
  const [isPostingReview, setIsPostingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [likedReviews, setLikedReviews] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchGameById(gameId)
      .then(result => {
        if (!isMounted) return;
        if (!result) {
          setError('Game not found.');
        }
        setGame(result);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Unable to load game details. Please try again later.');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  useEffect(() => {
    if (!game?.id) return;
    let isMounted = true;
    setIsLoadingReviews(true);

    getReviews(game.id)
      .then(data => {
        if (!isMounted) return;
        setReviews(data);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingReviews(false);
      });

    return () => {
      isMounted = false;
    };
  }, [game?.id]);

  const downloadButtons: ExternalTarget[] = useMemo(() => {
    if (!game) return [];

    return [
      { platform: 'app-store', url: 'https://www.apple.com/uk/app-store/' },
      { platform: 'play-store', url: 'https://play.google.com/store' },
    ];
  }, [game]);

  const handlePostReview = async () => {
    if (!game || !writtenReview.trim()) return;
    setIsPostingReview(true);
    setReviewError(null);
    try {
      const created = await postReview(game.id, writtenReview.trim());
      setWrittenReview('');
      setReviews(prev => [created, ...prev]);
    } catch (err) {
      console.error(err);
      setReviewError('Failed to post review. Please try again.');
    } finally {
      setIsPostingReview(false);
    }
  };

  const handleToggleLike = async (review: ReviewDto, nextLiked: boolean) => {
    try {
      // Optimistic update of like count and local liked set
      setReviews(prev =>
        prev.map(r =>
          r._id === review._id ? { ...r, likes: Math.max(0, r.likes + (nextLiked ? 1 : -1)) } : r
        )
      );
      setLikedReviews(prev => {
        const updated = new Set(prev);
        if (nextLiked) {
          updated.add(review._id);
        } else {
          updated.delete(review._id);
        }
        return updated;
      });

      await toggleReviewLike(review._id, nextLiked);
    } catch (err) {
      console.error(err);
      // In case of failure, refetch reviews and reset liked state for accuracy
      if (game?.id) {
        try {
          const latest = await getReviews(game.id);
          setReviews(latest);
          setLikedReviews(new Set());
        } catch (innerErr) {
          console.error(innerErr);
        }
      }
    }
  };

  if (loading) {
    return (
      <main className="game-details" aria-busy="true">
        <p className="game-details__loading">Loading game details…</p>
      </main>
    );
  }

  if (error || !game) {
    return (
      <main className="game-details">
        <button type="button" className="game-details__back" onClick={onBack}>
          Back
        </button>
        <p className="game-details__error">{error ?? 'Game not found.'}</p>
      </main>
    );
  }

  const accessibilityCount = game.accessibilityTags?.length ?? 0;

  // Split accessibility tags roughly between Visual and Motor sections
  const visualTags = game.accessibilityTags.slice(0, Math.ceil(game.accessibilityTags.length / 2));
  const motorTags = game.accessibilityTags.slice(Math.ceil(game.accessibilityTags.length / 2));

  const isMaxEvans = isAuthenticated && user?.name === 'Max Evans';
  const postingName = isMaxEvans ? user?.name : user?.name ?? 'Guest';

  return (
    <main className="game-details" aria-label={`Game details for ${game.title}`}>
      <nav className="game-details__breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="game-details__breadcrumb-link" onClick={onBack}>
          Browse
        </button>
        <span className="game-details__breadcrumb-separator">/</span>
        <span className="game-details__breadcrumb-current">{game.title}</span>
      </nav>

      <button type="button" className="game-details__back" onClick={onBack}>
        Back
      </button>

      <section className="game-details__hero" aria-label="Game summary">
        <div className="game-details__hero-left">
          <div className="game-details__hero-card">
            <img
              src={game.thumbnailUrl}
              alt={game.title}
              className="game-details__hero-image"
            />
            <div className="game-details__hero-actions">
              <button type="button" className="game-details__primary-btn">
                Add to Favourites
              </button>
              <button type="button" className="game-details__secondary-btn">
                Report Game
              </button>
            </div>

            <div className="game-details__hero-meta">
              <div className="game-details__info-card">
                <p className="game-details__info-label">Release Year</p>
                <p className="game-details__info-value">
                  {game.releaseYear ?? 'Release year not available'}
                </p>
                <p className="game-details__info-sub">
                  {accessibilityCount} accessibility features
                </p>
              </div>

              <div className="game-details__download-card">
                <p className="game-details__download-heading">Download Now:</p>
                <div className="game-details__download-buttons">
                  {downloadButtons.map(btn => (
                    <button
                      key={btn.platform}
                      type="button"
                      className={`download-button download-button--${btn.platform}`}
                      onClick={() => setExternalTarget(btn)}
                    >
                      <div className="download-button__inner">
                        <span
                          className={`download-button__icon download-button__icon--${btn.platform}`}
                          aria-hidden="true"
                        />
                        <span className="download-button__label">
                          {btn.platform === 'app-store'
                            ? 'Download on the App Store'
                            : 'Get it on Google Play'}
                        </span>
                      </div>
                      <span className="download-button__external" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="game-details__hero-right">
          <h1 className="game-details__title">{game.title}</h1>
          <p className="game-details__studio">By {game.studio}</p>

          <div className="game-details__tags-row">
            {game.genres.map(genre => (
              <span key={genre} className="pill pill--genre">
                {genre}
              </span>
            ))}
          </div>

          <section
            className="game-details__accessibility-summary"
            aria-label="Accessibility features"
          >
            <h2 className="game-details__section-heading">Accessibility Features</h2>
            <div className="game-details__accessibility-grid">
              <article className="game-details__accessibility-card">
                <header className="game-details__accessibility-card-header">
                  <span className="game-details__accessibility-icon" aria-hidden="true" />
                  <h3>Visual</h3>
                </header>
                <hr className="game-details__accessibility-divider" />
                <ul className="game-details__feature-list">
                  {visualTags.map(tag => (
                    <li key={tag} className="game-details__feature-item">
                      <span className="game-details__feature-tick" aria-hidden="true" />
                      <span>{tag}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="game-details__accessibility-card">
                <header className="game-details__accessibility-card-header">
                  <span
                    className="game-details__accessibility-icon game-details__accessibility-icon--motor"
                    aria-hidden="true"
                  />
                  <h3>Motor</h3>
                </header>
                <hr className="game-details__accessibility-divider" />
                <ul className="game-details__feature-list">
                  {motorTags.map(tag => (
                    <li key={tag} className="game-details__feature-item">
                      <span className="game-details__feature-tick" aria-hidden="true" />
                      <span>{tag}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </section>

          <section className="game-details__about" aria-label="About this game">
            <h2>About This Game</h2>
            <p className="game-details__about-text">{game.description}</p>
          </section>
        </div>
      </section>

      <section className="game-details__reviews" aria-label="Accessibility Reviews">
        <h2>Accessibility Reviews</h2>

        <div className="game-details__reviews-layout">
          {isAuthenticated ? (
            <article className="game-details__reviews-share game-details__reviews-share--logged-in">
              <header className="game-details__reviews-share-header">
                <h3>Share Your Experience</h3>
                <p className="game-details__posting-as">Posting as {postingName}</p>
              </header>

              <div className="game-details__reviews-card-body">
                <div className="game-details__reviews-field">
                  <label htmlFor="written-review" className="game-details__reviews-label">
                    Written Review <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="written-review"
                    className="game-details__reviews-textarea"
                    rows={4}
                    value={writtenReview}
                    onChange={e => setWrittenReview(e.target.value)}
                    placeholder="Share your thoughts on the accessibility of this game. What worked well? What could be improved?"
                  />
                  <p className="game-details__reviews-note">
                    A written review is required, or you can use voice recording below instead.
                  </p>
                  {reviewError && (
                    <p className="game-details__reviews-error" role="alert">
                      {reviewError}
                    </p>
                  )}
                </div>

                <div className="game-details__reviews-field">
                  <h4 className="game-details__reviews-subheading">Voice Review (Optional)</h4>
                  <p className="game-details__reviews-helper">
                    Record your review using your voice. The transcript will be added to your
                    review.
                  </p>
                  <button type="button" className="game-details__voice-button">
                    <span className="game-details__voice-icon" aria-hidden="true" />
                    Start Voice Recording
                  </button>
                </div>

                <div className="game-details__reviews-actions">
                  <button
                    type="button"
                    className="game-details__primary-btn game-details__primary-btn--submit"
                    onClick={handlePostReview}
                    disabled={!writtenReview.trim() || isPostingReview}
                  >
                    {isPostingReview ? 'Posting...' : 'Post Review'}
                  </button>
                </div>
              </div>
            </article>
          ) : (
            <article className="game-details__reviews-share game-details__reviews-share--logged-out" aria-label="Login to review">
              <div className="game-details__reviews-login-card">
                <div className="game-details__reviews-login-copy">
                  <h3>Share Your Experience</h3>
                  <p>Please login to write a review about the accessibility of this game.</p>
                </div>
                <button type="button" className="game-details__primary-btn game-details__primary-btn--login" onClick={() => {
                    window.location.href = '/signin';
                  }}>
                  Login to Review
                </button>
              </div>
            </article>
          )}

          <section className="game-details__reviews-see" aria-label="See Reviews">
            <header className="game-details__reviews-see-header">
              <h3>See Reviews</h3>
              <p className="game-details__reviews-see-copy">
                Read what other players are saying about the accessibility of this game
              </p>
            </header>

            {isLoadingReviews && <p className="game-details__reviews-loading">Loading reviews…</p>}

            {!isLoadingReviews && reviews.length === 0 && (
              <p className="game-details__reviews-empty">No reviews yet. Be the first to share your experience.</p>
            )}

            {!isLoadingReviews &&
              reviews.map(review => {
                const createdDate = new Date(review.createdAt).toLocaleDateString();
                const liked = likedReviews.has(review._id);
                const handleClickLike = () => {
                  const nextLiked = !liked;
                  handleToggleLike(review, nextLiked);
                };

                return (
                  <div key={review._id} className="game-details__review-card">
                    <header className="game-details__review-card-header">
                      <div className="game-details__review-avatar" aria-hidden="true">
                        {review.authorName
                          .split(' ')
                          .map(part => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="game-details__review-meta">
                        <p className="game-details__review-author">{review.authorName}</p>
                        <p className="game-details__review-date">{createdDate}</p>
                      </div>
                      {isMaxEvans && review.authorName === 'Max Evans' && (
                        <button type="button" className="game-details__review-delete">
                          Delete
                        </button>
                      )}
                    </header>
                    <p className="game-details__review-text">{review.body}</p>
                    <div className="game-details__review-footer">
                      <button
                        type="button"
                        className={`game-details__review-like${liked ? ' game-details__review-like--active' : ''}`}
                        onClick={handleClickLike}
                      >
                        <span aria-hidden="true" className="game-details__review-like-icon" />
                        {review.likes}
                      </button>
                      <button
                        type="button"
                        className="game-details__review-report"
                        onClick={() => onReportReview?.(review._id)}
                      >
                        <span aria-hidden="true" className="game-details__review-report-icon" />
                        Report
                      </button>
                    </div>
                  </div>
                );
              })}

            {reviews.length > 0 && (
              <button type="button" className="game-details__load-more">
                <span aria-hidden="true" className="game-details__load-more-caret" />
                Load More Reviews
              </button>
            )}
          </section>
        </div>
      </section>

      <Modal
        isOpen={!!externalTarget}
        titleId="external-link-title"
        descriptionId="external-link-description"
        onClose={() => setExternalTarget(null)}
      >
        <div className="game-details__external-modal">
          <h2 id="external-link-title" className="game-details__external-title">
            You are leaving PlayAble
          </h2>
          <p id="external-link-description" className="game-details__external-body">
            You are about to open this game in the{' '}
            {externalTarget?.platform === 'app-store' ? 'App Store' : 'Google Play Store'}. This
            will take you to an external website.
          </p>
          <div className="game-details__external-actions">
            <button
              type="button"
              className="game-details__secondary-btn"
              onClick={() => setExternalTarget(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="game-details__primary-btn"
              onClick={() => {
                if (!externalTarget) return;
                const target = '_blank';
                window.open(externalTarget.url, target, 'noopener,noreferrer');
                setExternalTarget(null);
              }}
            >
              Proceed
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
};

export default GameDetailsPage;
