import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GameDto,
  getCachedGame,
  getGameById,
  getReviews,
  getUserDisplayName,
  postReview,
  ReviewDto,
  toggleReviewLike,
  deleteReview,
  addToRecentlyViewed,
} from '../services/api';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useFavouritesNav } from '../context/FavouritesContext';
import type { AppPath } from '../App';
import { buildAccessibilitySections } from '../utils/accessibility';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { useVoiceAssistant } from '../context/VoiceAssistantContext';

const BASE_REVIEW_COUNT = 2;
const LOAD_MORE_REVIEWS_STEP = 5;

interface GameDetailsPageProps {
  gameId: string;
  onBack: () => void;
  onNavigate?: (path: AppPath) => void;
  onOpenGameReport?: (gameId: string) => void;
  onOpenReviewReport?: (reviewId: string, gameId: string) => void;
}

interface ExternalTarget {
  platform: 'app-store' | 'play-store';
  url: string;
}

const GameDetailsPage: React.FC<GameDetailsPageProps> = ({
  gameId,
  onBack,
  onNavigate,
  onOpenGameReport,
  onOpenReviewReport,
}) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toggleFavourite, isFavourite } = useFavouritesNav();

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
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});
  const [visibleReviewCount, setVisibleReviewCount] = useState(BASE_REVIEW_COUNT);
  const reviewsListRef = useRef<HTMLDivElement | null>(null);
  const [showVoiceNavError, setShowVoiceNavError] = useState(false);
  const baseReviewTextRef = useRef<string>(''); // Track text before recording started

  const { cancelListening, forceStopRecognition, microphoneActive, voiceInputEnabled } = useVoiceAssistant();
  const {
    transcript: voiceTranscript,
    isRecording: isVoiceRecording,
    error: voiceError,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
    clearTranscript: clearVoiceTranscript,
    hasTranscript: hasVoiceTranscript,
  } = useVoiceRecording();

  // Start voice recording - check if voice navigation is active first
  const handleStartRecording = async () => {
    try {
      console.log('Starting voice recording...');
      
      const isVoiceNavigationActive = microphoneActive && voiceInputEnabled;

      if (isVoiceNavigationActive) {
        setShowVoiceNavError(true);
        return;
      }

      setShowVoiceNavError(false);
      baseReviewTextRef.current = writtenReview.trim();

      if (forceStopRecognition) {
        forceStopRecognition();
      }
      cancelListening();

      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('Calling startVoiceRecording...');
      await startVoiceRecording();
      console.log('Voice recording started successfully');
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setReviewError('Failed to start voice recording. Please check your microphone permissions and try again.');
    }
  };

  // Clear error when voice navigation is disabled
  useEffect(() => {
    const isVoiceNavigationActive = microphoneActive && voiceInputEnabled;
    
    if (!isVoiceNavigationActive) {
      setShowVoiceNavError(false);
    }
  }, [microphoneActive, voiceInputEnabled]);

  // Sync voice transcript to written review textarea in real-time
  useEffect(() => {
    if (isVoiceRecording) {
      // Combine base text (from before recording) with current voice transcript
      const baseText = baseReviewTextRef.current;
      // Always update, even if transcript is empty (it will update as speech is detected)
      const combined = baseText && voiceTranscript 
        ? `${baseText} ${voiceTranscript}`.trim() 
        : voiceTranscript || baseText || '';
      setWrittenReview(combined);
    }
  }, [voiceTranscript, isVoiceRecording]);

  const minReviewLength = 10;

  useEffect(() => {
    let isMounted = true;
    const cached = getCachedGame(gameId);
    if (cached) {
      setGame(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    getGameById(gameId)
      .then(result => {
        if (!isMounted) return;
        if (!result) {
          setError('Game not found.');
        } else {
          setGame(result);
        }
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
    if (!isAuthenticated || !gameId) return;
    addToRecentlyViewed(gameId).catch(err => {
      console.error('Failed to track recently viewed game', err);
    });
  }, [gameId, isAuthenticated]);

  useEffect(() => {
    if (!game?.id) return;
    let isMounted = true;
    setIsLoadingReviews(true);

    getReviews(game.id)
      .then(data => {
        if (!isMounted) return;
        setReviews(Array.isArray(data) ? data : []);
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

  useEffect(() => {
    setVisibleReviewCount(prev => {
      if (reviews.length <= BASE_REVIEW_COUNT) {
        return reviews.length;
      }
      return Math.max(BASE_REVIEW_COUNT, Math.min(prev, reviews.length));
    });
  }, [reviews]);

  // Fetch missing reviewer display names for reviews that don't include authorName
  useEffect(() => {
    const missingUserIds = Array.from(
      new Set(
        reviews
          .filter(r => !r.authorName?.trim() && r.userId && !reviewerNames[r.userId])
          .map(r => r.userId)
      )
    );

    if (!missingUserIds.length) return;

    let isCurrent = true;
    (async () => {
      const results = await Promise.all(
        missingUserIds.map(async id => {
          const name = await getUserDisplayName(id);
          return { id, name };
        })
      );

      if (!isCurrent) return;

      setReviewerNames(prev => {
        const next = { ...prev };
        results.forEach(({ id, name }) => {
          if (name) {
            next[id] = name;
          }
        });
        return next;
      });
    })();

    return () => {
      isCurrent = false;
    };
  }, [reviews, reviewerNames]);

  const downloadButtons: ExternalTarget[] = useMemo(() => {
    if (!game) return [];

    return [
      { platform: 'app-store', url: 'https://www.apple.com/uk/app-store/' },
      { platform: 'play-store', url: 'https://play.google.com/store' },
    ];
  }, [game]);

  const displayedReviews = useMemo(
    () => reviews.slice(0, visibleReviewCount),
    [reviews, visibleReviewCount]
  );
  const totalReviews = reviews.length;
  const canLoadMoreReviews = totalReviews > visibleReviewCount;
  const showLoadMoreReviewsButton = totalReviews > 0;
  const loadMoreButtonLabel = canLoadMoreReviews
    ? 'Load More Reviews'
    : totalReviews > BASE_REVIEW_COUNT
      ? 'All Reviews Loaded'
      : 'All Reviews Displayed';

  /**
   * Increments the number of visible reviews in fixed steps for the "Load More" interaction.
   */
  const handleLoadMoreReviews = () => {
    setVisibleReviewCount(prev =>
      Math.min(prev + LOAD_MORE_REVIEWS_STEP, totalReviews)
    );
  };

  const handleReviewBlur = () => {
    const trimmed = writtenReview.trim();
    if (!trimmed) {
      setReviewError(null);
      return;
    }
    if (trimmed.length < minReviewLength) {
      setReviewError(`Review must be at least ${minReviewLength} characters long.`);
    } else {
      setReviewError(null);
    }
  };

  const handlePostReview = async () => {
    const reviewText = writtenReview.trim();

    if (!game || (reviewText.length < minReviewLength && !hasVoiceTranscript)) {
      if (reviewText.length < minReviewLength) {
        setReviewError(`Review must be at least ${minReviewLength} characters long, or include a voice recording.`);
      }
      return;
    }

    // Stop recording if still active
    if (isVoiceRecording) {
      stopVoiceRecording();
    }

    setIsPostingReview(true);
    setReviewError(null);
    try {
      const created = await postReview(game.id, reviewText, postingName);
      // Ensure the newly created review reflects the same postingName used in the UI, even if backend omits it
      const createdWithDisplayName: ReviewDto = {
        ...created,
        authorName: created.authorName || postingName,
      };
      setWrittenReview('');
      baseReviewTextRef.current = '';
      clearVoiceTranscript();
      setReviews(prev => [createdWithDisplayName, ...prev]);
    } catch (err: any) {
      console.error(err);
      const serverMessage = err?.response?.data?.message;
      setReviewError(serverMessage || 'Failed to post review. Please try again.');
    } finally {
      setIsPostingReview(false);
    }
  };

  const handleToggleLike = async (review: ReviewDto, nextLiked: boolean) => {
    if (!isAuthenticated) {
      if (onNavigate) {
        onNavigate('/signin');
      } else {
        navigate('/signin');
      }
      return;
    }
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

  const accessibilitySections = useMemo(
    () => (game ? buildAccessibilitySections(game) : []),
    [game]
  );
  const accessibilityCount = useMemo(() => {
    if (!game) return 0;
    if (game.specificAccessibilityTags) {
      return Object.values(game.specificAccessibilityTags).reduce((sum, tags) => {
        if (Array.isArray(tags)) {
          return sum + tags.length;
        }
        return sum;
      }, 0);
    }
    return game.accessibilityTags?.length ?? 0;
  }, [game]);

  const handleReportGame = () => {
    if (!game) return;
    const dbId = (game as any)._id ?? game.id;
    if (onOpenGameReport) {
      onOpenGameReport(dbId);
    } else if (onNavigate) {
      onNavigate(`/report/game/${dbId}`);
    } else {
      navigate(`/report/game/${dbId}`);
    }
  };

  const handleReportReview = (reviewId: string) => {
    if (!reviewId) return;
    if (onOpenReviewReport && game) {
      const dbId = (game as any)._id ?? game.id;
      onOpenReviewReport(reviewId, dbId);
    } else if (onNavigate && game) {
      const dbId = (game as any)._id ?? game.id;
      onNavigate(`/report/review/${dbId}/${reviewId}`);
    } else if (game) {
      const dbId = (game as any)._id ?? game.id;
      navigate(`/report/review/${dbId}/${reviewId}`);
    }
  };

  const handleToggleFavourite = async () => {
    if (!game) return;
    if (!isAuthenticated) {
      if (onNavigate) {
        onNavigate('/signin');
      } else {
        navigate('/signin');
      }
      return;
    }
    try {
      await toggleFavourite(game.id);
    } catch (err) {
      console.error('Failed to toggle favourite from GameDetailsPage', err);
    }
  };

  const isGameFavourite = game ? isFavourite(game.id) : false;

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

  const isMaxEvans = isAuthenticated && user?.name === 'Max Evans';
  const postingName = isMaxEvans ? user?.name : user?.name ?? user?.email ?? 'Guest';

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
              alt={`${game.title} game thumbnail`}
              className="game-details__hero-image"
            />
            <div className="game-details__hero-actions">
              <button
                type="button"
                className="game-details__secondary-btn game-details__secondary-btn--favourite"
                onClick={handleToggleFavourite}
                aria-pressed={isGameFavourite}
              >
                <span
                  className={`game-details__favourite-icon${isGameFavourite ? ' game-details__favourite-icon--active' : ''}`}
                  aria-hidden="true"
                />
                <span>{isGameFavourite ? 'Unfavourite' : 'Add to favourites'}</span>
              </button>
              <button
                type="button"
                className="game-details__secondary-btn"
                onClick={handleReportGame}
              >
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
                      aria-label={
                        btn.platform === 'app-store'
                          ? 'Download on the App Store'
                          : 'Get it on Google Play'
                      }
                      onClick={() => setExternalTarget(btn)}
                    >
                      <div className="download-button__inner">
                        <span
                          className={`download-button__icon download-button__icon--${btn.platform}`}
                          aria-hidden="true"
                        />
                        <span className="download-button__label" aria-hidden="true">
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
          <p className="game-details__studio">Studio: {game.studio}</p>

          <p className="game-details__genres-label">Genres</p>
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
            {accessibilitySections.length > 0 ? (
              <div className="game-details__accessibility-grid">
                {accessibilitySections.map(section => (
                  <article key={section.category} className="game-details__accessibility-card">
                    <header className="game-details__accessibility-card-header">
                      <span className="game-details__accessibility-icon" aria-hidden="true" />
                      <h3>{section.category}</h3>
                    </header>
                    <hr className="game-details__accessibility-divider" />
                    <ul className="game-details__feature-list">
                      {section.tags.map(tag => (
                        <li key={tag} className="game-details__feature-item">
                          <span className="game-details__feature-tick" aria-hidden="true" />
                          <span>{tag}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <p className="game-details__about-text">
                Accessibility feature information is not available for this title yet.
              </p>
            )}
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
                    onChange={e => {
                      const nextValue = e.target.value;
                      setWrittenReview(nextValue);
                      if (reviewError && nextValue.trim().length >= minReviewLength) {
                        setReviewError(null);
                      }
                    }}
                    onBlur={handleReviewBlur}
                    placeholder={`Share your thoughts on the game's accessibility (minimum ${minReviewLength} characters).`}
                  />
                  {reviewError && (
                    <p className="game-details__reviews-error" role="alert">
                      {reviewError}
                    </p>
                  )}
                </div>

                <div className="game-details__reviews-field">
                  <h4 className="game-details__reviews-subheading">Voice Review (Optional)</h4>
                  <p className="game-details__reviews-helper">
                    Record your review using your voice. Your speech will be typed directly into the review field above as you speak.
                  </p>
                  {voiceError && (
                    <div className="game-details__voice-error-inline" role="alert" aria-live="polite">
                      <p className="game-details__voice-error-inline-text">
                        {voiceError}
                      </p>
                    </div>
                  )}
                  {(hasVoiceTranscript || isVoiceRecording) && (
                    <div className="game-details__voice-transcript">
                      <p className="game-details__voice-transcript-label">
                        {isVoiceRecording ? 'Live Transcript:' : 'Transcript:'}
                      </p>
                      <p className={`game-details__voice-transcript-text ${isVoiceRecording ? 'game-details__voice-transcript-text--live' : ''}`}>
                        {voiceTranscript || (isVoiceRecording ? 'Listening...' : '')}
                      </p>
                    </div>
                  )}
                  <div className="game-details__voice-controls">
                    {!isVoiceRecording ? (
                      <button
                        type="button"
                        className="game-details__voice-button"
                        onClick={handleStartRecording}
                        disabled={isPostingReview}
                      >
                        <span className="game-details__voice-icon" aria-hidden="true" />
                        <span className="game-details__voice-button-text">
                          {hasVoiceTranscript ? 'Record Again' : 'Start Voice Recording'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="game-details__voice-button game-details__voice-button--recording"
                        onClick={stopVoiceRecording}
                        disabled={isPostingReview}
                      >
                        <span className="game-details__voice-icon game-details__voice-icon--recording" aria-hidden="true" />
                        <span className="game-details__voice-button-text">Stop Recording</span>
                      </button>
                    )}
                    {hasVoiceTranscript && !isVoiceRecording && (
                      <button
                        type="button"
                        className="game-details__voice-button game-details__voice-button--clear"
                        onClick={() => {
                          setWrittenReview(baseReviewTextRef.current);
                          clearVoiceTranscript();
                        }}
                        disabled={isPostingReview}
                      >
                        <span className="game-details__voice-button-text">Clear Transcript</span>
                      </button>
                    )}
                  </div>
                  {showVoiceNavError && microphoneActive && voiceInputEnabled && (
                    <div className="game-details__voice-error-inline" role="alert" aria-live="polite">
                      <p className="game-details__voice-error-inline-text">
                        Voice navigation must be turned off for voice recording to work. Please disable voice navigation in Settings or mute the microphone in the navbar, then try again.
                      </p>
                    </div>
                  )}
                  {isVoiceRecording && (
                    <p className="game-details__voice-status">
                      <span className="game-details__voice-status-dot" aria-hidden="true" />
                      Recording... Speak now.
                    </p>
                  )}
                </div>

                <div className="game-details__reviews-actions">
                  <button
                    type="button"
                    className="game-details__primary-btn game-details__primary-btn--submit"
                    onClick={handlePostReview}
                    disabled={isPostingReview}
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
                <button
                  type="button"
                  className="game-details__primary-btn game-details__primary-btn--login"
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('/signin');
                    } else {
                      navigate('/signin');
                    }
                  }}
                >
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

            {!isLoadingReviews && (
              <div ref={reviewsListRef} id="game-details__reviews-list">
                {displayedReviews.map(review => {
                  const createdDate = new Date(review.createdAt).toLocaleDateString();
                const liked = likedReviews.has(review._id);
                const canDelete = isAuthenticated && user && review.userId === user.id;
                const displayAuthorName =
                  review.authorName?.trim() ||
                  reviewerNames[review.userId] ||
                  (review.userId === user?.id ? postingName : '') ||
                  'Anonymous';
                const displayInitials = displayAuthorName
                  .split(' ')
                  .map(part => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                const handleClickLike = () => {
                  const nextLiked = !liked;
                  handleToggleLike(review, nextLiked);
                };

                  return (
                    <div key={review._id} className="game-details__review-card">
                    <header className="game-details__review-card-header">
                      <div className="game-details__review-avatar" aria-hidden="true">
                        {displayInitials}
                      </div>
                      <div className="game-details__review-meta">
                        <span className="game-details__review-author">{displayAuthorName}</span>
                        <span className="game-details__review-date">Reviewed on {createdDate}</span>
                      </div>
                    </header>
                    <p className="game-details__review-text">{review.body}</p>
                    <footer className="game-details__review-footer">
                      <button
                        type="button"
                        className={`game-details__review-like${liked ? ' game-details__review-like--active' : ''}`}
                        onClick={handleClickLike}
                      >
                        <span className="game-details__review-like-icon" aria-hidden="true" />
                        <span>{review.likes}</span>
                      </button>
                      <button
                        type="button"
                        className="game-details__review-report"
                        onClick={() => handleReportReview(review._id)}
                      >
                        <span className="game-details__review-report-icon" aria-hidden="true" />
                        <span>Report</span>
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          className="game-details__review-delete"
                          onClick={async () => {
                            const confirmed = window.confirm('Are you sure you want to delete this review?');
                            if (!confirmed) return;

                            try {
                              await deleteReview(review._id);
                              setReviews(prev => prev.filter(r => r._id !== review._id));
                            } catch (err) {
                              console.error('Failed to delete review', err);
                            }
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </footer>
                    </div>
                  );
                })}
              </div>
            )}

            {showLoadMoreReviewsButton && (
              <button
                type="button"
                className="game-details__load-more"
                onClick={handleLoadMoreReviews}
                disabled={!canLoadMoreReviews}
                aria-disabled={!canLoadMoreReviews}
              >
                <span aria-hidden="true" className="game-details__load-more-caret" />
                {loadMoreButtonLabel}
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
            You are about to leave PlayAble
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
