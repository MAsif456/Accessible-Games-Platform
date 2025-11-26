import { useEffect, useMemo, useState } from 'react';

export type ReportMode = 'general' | 'game' | 'review';

/////// CURRENTLY NO BACKEND /////////

interface BaseReportContext {
  mode: ReportMode;
}

interface GeneralReportContext extends BaseReportContext {
  mode: 'general';
}

interface GameReportContext extends BaseReportContext {
  mode: 'game';
  game: {
    thumbnailUrl: string;
    title: string;
    studio: string;
  };
}

interface ReviewReportContext extends BaseReportContext {
  mode: 'review';
  game: {
    thumbnailUrl: string;
    title: string;
    studio: string;
  };
  review: {
    author: string;
    date: string;
    text: string;
  };
}

export type ReportContext = GeneralReportContext | GameReportContext | ReviewReportContext;

// Strategy interfaces
interface ReportStrategy {
  getHeading(): string;
  getBannerMessage(): string;
  renderContextBlock(): JSX.Element | null;
}

class GeneralReportStrategy implements ReportStrategy {
  constructor(private ctx: GeneralReportContext) {}

  getHeading() {
    return 'Report an Issue';
  }

  getBannerMessage() {
    return 'Your report will be sent directly to our admin team for review. We take all accessibility concerns seriously and work with developers to address them.';
  }

  renderContextBlock() {
    return null;
  }
}

class GameReportStrategy implements ReportStrategy {
  constructor(private ctx: GameReportContext) {}

  getHeading() {
    return 'Report a Game Issue';
  }

  getBannerMessage() {
    return 'Your report will be sent directly to our admin team for review. We take all accessibility concerns seriously and work with developers to address them.';
  }

  renderContextBlock() {
    const { game } = this.ctx;
    return (
      <section className="report-page__context" aria-label="Report context">
        <h2 className="report-page__context-title">Report Context</h2>
        <p className="report-page__context-label">Reporting About</p>
        <div className="report-page__game-card">
          <img
            src={game.thumbnailUrl}
            alt={game.title}
            className="report-page__game-thumbnail"
          />
          <div className="report-page__game-meta">
            <p className="report-page__game-title">{game.title}</p>
            <p className="report-page__game-studio">{game.studio}</p>
          </div>
        </div>
      </section>
    );
  }
}

class ReviewReportStrategy implements ReportStrategy {
  constructor(private ctx: ReviewReportContext) {}

  getHeading() {
    return 'Report a Review';
  }

  getBannerMessage() {
    return 'Your report will be sent directly to our moderation team for review. We take all community guideline violations seriously and will investigate this review promptly.';
  }

  renderContextBlock() {
    const { game, review } = this.ctx;
    return (
      <section className="report-page__context" aria-label="Report context">
        <h2 className="report-page__context-title">Report Context</h2>
        <p className="report-page__context-label">Reporting About</p>
        <div className="report-page__game-card">
          <img
            src={game.thumbnailUrl}
            alt={game.title}
            className="report-page__game-thumbnail"
          />
          <div className="report-page__game-meta">
            <p className="report-page__game-title">{game.title}</p>
            <p className="report-page__game-studio">{game.studio}</p>
          </div>
        </div>

        <div className="report-page__review-panel" aria-label="Review being reported">
          <div className="report-page__review-header">
            <p className="report-page__review-author">{review.author}</p>
            <p className="report-page__review-date">{review.date}</p>
          </div>
          <p className="report-page__review-text">“{review.text}”</p>
          <p className="report-page__review-guidelines">
            Please explain why you believe this review violates our community guidelines.
          </p>
        </div>
      </section>
    );
  }
}

// Helper to create a strategy from context
const createStrategy = (ctx: ReportContext): ReportStrategy => {
  switch (ctx.mode) {
    case 'game':
      return new GameReportStrategy(ctx);
    case 'review':
      return new ReviewReportStrategy(ctx);
    case 'general':
    default:
      return new GeneralReportStrategy(ctx as GeneralReportContext);
  }
};

// Simple mock voice recorder that just stores transcript text
const useVoiceTranscript = () => {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = () => {
    // Placeholder: reasl recording to be integrated later
    setIsRecording(true);
    // In future real implementation transcript will be populated
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const clearTranscript = () => setTranscript('');

  return { transcript, setTranscript, isRecording, startRecording, stopRecording, clearTranscript };
};

interface ReportPageProps {
  // Optional props so other pages can pass in context when navigating imperatively.
  initialContext?: Partial<ReportContext>;
}

const getDefaultContext = (searchParams: URLSearchParams): ReportContext => {
  const modeParam = searchParams.get('mode') as ReportMode | null;
  const mode: ReportMode = modeParam || 'general';

  if (mode === 'game') {
    return {
      mode: 'game',
      game: {
        thumbnailUrl: searchParams.get('gameThumbnail') || '/images/games/monument-valley.jpg',
        title: searchParams.get('gameTitle') || 'Unknown Game',
        studio: searchParams.get('gameStudio') || 'Unknown Studio',
      },
    };
  }

  if (mode === 'review') {
    return {
      mode: 'review',
      game: {
        thumbnailUrl: searchParams.get('gameThumbnail') || '/images/games/monument-valley.jpg',
        title: searchParams.get('gameTitle') || 'Unknown Game',
        studio: searchParams.get('gameStudio') || 'Unknown Studio',
      },
      review: {
        author: searchParams.get('reviewAuthor') || 'Unknown reviewer',
        date: searchParams.get('reviewDate') || 'Unknown date',
        text: searchParams.get('reviewText') || 'No review text provided.',
      },
    };
  }

  return { mode: 'general' };
};

const ReportPage: React.FC<ReportPageProps> = ({ initialContext }) => {
  const [description, setDescription] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice transcript hook
  const {
    transcript,
    setTranscript,
    isRecording,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useVoiceTranscript();

  // Derive context from URL + optional initialContext
  const context = useMemo<ReportContext>(() => {
    const params = new URLSearchParams(window.location.search);
    const base = getDefaultContext(params);
    return { ...base, ...(initialContext || {}) } as ReportContext;
  }, [initialContext]);

  const strategy = useMemo(() => createStrategy(context), [context]);

  const descriptionLength = description.trim().length;
  const isDescriptionValid = descriptionLength >= 10;
  const hasVoice = transcript.trim().length > 0;
  const canSubmit = isDescriptionValid || hasVoice;

  // Auto-scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearDescription = () => {
    setDescription('');
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setHasSubmitted(false);

    if (!canSubmit) {
      setError('Please enter at least 10 characters or add a voice recording.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit to backend reports API (to be implemented)
      await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: context.mode,
          context,
          description: description.trim(),
          transcript: transcript.trim(),
        }),
      });

      setHasSubmitted(true);
      setDescription('');
      setTranscript('');
    } catch (submitError) {
      console.error('Failed to submit report', submitError);
      setError('Something went wrong while submitting your report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="report-page" aria-label="Report an issue">
      <div className="report-page__inner">
        <button
          type="button"
          className="report-page__back-link"
          onClick={() => window.history.back()}
        >
          <span aria-hidden="true">&#8592;</span> Back
        </button>

        <div className="report-page__header">
          <span className="report-page__icon" aria-hidden="true">
            🚩
          </span>
          <h1 className="report-page__title">{strategy.getHeading()}</h1>
        </div>

        <section className="report-page__banner" aria-live="polite">
          <p className="report-page__banner-text">{strategy.getBannerMessage()}</p>
        </section>

        <section className="report-page__card" aria-label="Report form">
          {/* Left: contextual block (for game/review) */}
          <div className="report-page__card-left">{strategy.renderContextBlock()}</div>

          {/* Right: form */}
          <div className="report-page__card-right">
            <form className="report-page__form" onSubmit={handleSubmit} noValidate>
              <div className="report-page__form-row">
                <div className="report-page__form-header">
                  <label htmlFor="report-description" className="report-page__field-label">
                    Written Description <span aria-hidden="true">*</span>
                  </label>
                  <span className="report-page__char-counter">
                    {descriptionLength} / 10 characters minimum
                  </span>
                </div>
                <textarea
                  id="report-description"
                  className="report-page__textarea"
                  value={description}
                  onChange={e => {
                    setDescription(e.target.value);
                    setError(null);
                  }}
                  minLength={10}
                  rows={4}
                  aria-required="true"
                  aria-invalid={!isDescriptionValid && !!description.length}
                  placeholder={
                    context.mode === 'review'
                      ? 'Please explain why this review should be reported (e.g., contains offensive language, spam, false information)... (minimum 10 characters)'
                      : 'Please describe the issue you encountered in detail... (minimum 10 characters)'
                  }
                />
                <p className="report-page__helper-text">
                  Minimum 10 characters required, or you can use voice recording below instead.
                </p>
                {description && (
                  <button
                    type="button"
                    className="report-page__clear-button"
                    onClick={handleClearDescription}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="report-page__form-row">
                <h2 className="report-page__section-title">Voice Recording (Optional)</h2>
                <p className="report-page__helper-text">
                  Record your report using your voice. The transcript will be added to your report.
                </p>
                <div className="report-page__voice-controls">
                  <button
                    type="button"
                    className="report-page__voice-button"
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    <span aria-hidden="true">🎤</span>
                    {isRecording ? 'Stop Voice Recording' : 'Start Voice Recording'}
                  </button>
                </div>
                {transcript && (
                  <div className="report-page__transcript">
                    <div className="report-page__transcript-header">
                      <span className="report-page__transcript-title">Transcript</span>
                      <button
                        type="button"
                        className="report-page__transcript-clear"
                        onClick={clearTranscript}
                      >
                        Clear transcript
                      </button>
                    </div>
                    <textarea
                      className="report-page__textarea report-page__textarea--transcript"
                      value={transcript}
                      onChange={e => setTranscript(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="report-page__error" role="alert">
                  {error}
                </div>
              )}


              <div className="report-page__actions">
                <button
                  type="submit"
                  className="report-page__submit"
                  disabled={isSubmitting || !canSubmit}
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Success confirmation dialog */}
        {hasSubmitted && !error && (
        <div
            className="report-page__success-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-success-title"
        >
            <div className="report-page__success-dialog">
            <h2 id="report-success-title" className="report-page__success-title">
                Report submitted
            </h2>
            <p className="report-page__success-message">
                Thank you for your report. Our team will review it shortly.
            </p>
            <button
                type="button"
                className="report-page__success-button"
                onClick={() => setHasSubmitted(false)}
            >
                OK
            </button>
            </div>
        </div>
        )}

    
      </div>
    </main>
  );
};

export default ReportPage;
