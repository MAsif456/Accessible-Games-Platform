import { useEffect, useState } from 'react';
import { GameDto, getGameById, getReviewById } from '../services/api';

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
  const [state, setState] = useState<GameReportState>({ loading: !!gameId, error: null, game: null });

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;

    (async () => {
      try {
        const game = await getGameById(gameId);
        if (!cancelled) setState({ loading: false, error: null, game });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: 'Could not load game details.', game: null });
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

  useEffect(() => {
    if (!reviewId) return;
    let cancelled = false;

    (async () => {
      try {
        const { game, review } = await getReviewById(reviewId);
        if (!cancelled) setState({ loading: false, error: null, game, review });
      } catch (err) {
        if (!cancelled)
          setState({ loading: false, error: 'Could not load review details.', game: null, review: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  return state;
}
