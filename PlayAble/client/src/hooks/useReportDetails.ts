import { useEffect, useState } from 'react';
import { GameDto, getCachedGame, getGameById, getReviewById } from '../services/api';

export interface ReviewDetails {
  id: string;
  author: string;
  createdAt: string;
  content: string;
}

interface BaseState {
  loading: boolean;
  error: string | null;
}

export interface GameReportState extends BaseState {
  game: GameDto | null;
}

export interface ReviewReportState extends BaseState {
  game: GameDto | null;
  review: ReviewDetails | null;
}

export function useGameReportDetails(gameId?: string): GameReportState {
  const cached = gameId ? getCachedGame(gameId) : null;
  const [state, setState] = useState<GameReportState>({
    loading: !!gameId && !cached,
    error: null,
    game: cached ?? null,
  });
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    if (!gameId) return;
    const nextRequest = requestId + 1;
    setRequestId(nextRequest);
    let cancelled = false;

    (async () => {
      try {
        const game = await getGameById(gameId);
        if (!cancelled && requestId + 1 === nextRequest)
          setState({ loading: false, error: null, game });
      } catch (err) {
        if (!cancelled && requestId + 1 === nextRequest)
          setState({ loading: false, error: 'Could not load game details.', game: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return state;
}

export function useReviewReportDetails(reviewId?: string): ReviewReportState {
  const [state, setState] = useState<ReviewReportState>({
    loading: !!reviewId,
    error: null,
    game: null,
    review: null,
  });
  const [requestId, setRequestId] = useState(0);

  useEffect(() => {
    if (!reviewId) return;
    const nextRequest = requestId + 1;
    setRequestId(nextRequest);
    let cancelled = false;

    (async () => {
      try {
        const { game, review } = await getReviewById(reviewId);
        if (!cancelled && requestId + 1 === nextRequest) {
          const mappedReview: ReviewDetails = {
            id: review.id,
            author: review.author,
            createdAt: review.createdAt,
            content: review.content,
          };
          setState({
            loading: false,
            error: null,
            game: game ?? null,
            review: mappedReview,
          });
        }
      } catch (err) {
        if (!cancelled && requestId + 1 === nextRequest)
          setState({ loading: false, error: 'Could not load review details.', game: null, review: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  return state;
}
