export interface GetGamesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  genres?: string[];
  tags?: string[];
  sort?: string;
}

export interface GameDto {
  id: string;
  _id: string;
  slug: string;
  title: string;
  studio: string;
  description: string;
  thumbnailUrl: string;
  genres: string[];
  accessibilityTags: string[];
  releaseYear?: number;
}

export interface PaginatedGamesResponse {
  games: GameDto[];
  currentPage: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
}

// Single canonical ReviewDto used by reviews feature
export interface ReviewDto {
  _id: string;
  gameId: string;
  userId: string;
  authorName: string;
  body: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

// --- Recently Viewed (your branch) ---
export interface RecentlyViewedEntry {
  gameId: string;
  viewedAt: string;
}

export interface RecentlyViewedResponse {
  games: GameDto[];
  total: number;
  showing: string;
}

// --- Reporting / cached game helpers (incoming) ---
// Lightweight shape used by the reporting context hook
export interface ReportReviewDto {
  id: string;
  author: string;
  createdAt: string;
  content: string;
}

export interface ReviewWithGameResponse {
  game: GameDto;
  review: ReportReviewDto;
}

// Import CSRF-protected API helpers
import { apiPost, apiDelete } from '../utils/apiHelper';

// In-memory cache for games to speed up back/forward navigation
const gameCache = new Map<string, GameDto>();

function cacheGame(game: GameDto) {
  gameCache.set(game.id, game);
  if (game._id) {
    gameCache.set(game._id, game);
  }
}

function findCachedGame(gameId: string): GameDto | undefined {
  const direct = gameCache.get(gameId);
  if (direct) return direct;

  for (const cached of gameCache.values()) {
    if (cached.id === gameId || cached._id === gameId) {
      return cached;
    }
  }
  return undefined;
}

export async function getGames(params: GetGamesParams = {}): Promise<PaginatedGamesResponse> {
  const query = new URLSearchParams();

  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }

  if (params.genres && params.genres.length) query.set('genres', params.genres.join(','));
  if (params.tags && params.tags.length) query.set('tags', params.tags.join(','));
  if (params.sort) query.set('sort', params.sort);

  const res = await fetch(`/api/games?${query.toString()}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch games: ${res.status}`);
  }

  const data: PaginatedGamesResponse = await res.json();

  // Prime cache for faster lookups
  data.games.forEach(cacheGame);
  return data;
}

export async function getGameById(gameId: string): Promise<GameDto> {
  const cached = findCachedGame(gameId);
  if (cached) {
    return cached;
  }

  try {
    const byIdRes = await fetch(`/api/games/${encodeURIComponent(gameId)}`);
    if (byIdRes.ok) {
      const game = (await byIdRes.json()) as GameDto;
      cacheGame(game);
      return game;
    }
  } catch {
    // fall through to list fetch
  }

  const list = await getGames({ page: 1, pageSize: 200 });
  const match = list.games.find(g => g.id === gameId || g._id === gameId);
  if (!match) {
    throw new Error('Game not found');
  }
  cacheGame(match);
  return match;
}

export function getCachedGame(gameId: string): GameDto | undefined {
  return findCachedGame(gameId);
}

// Fetch a single review by ID, along with its game context, for the reporting page
export async function getReviewById(reviewId: string): Promise<ReviewWithGameResponse> {
  const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch review: ${res.status}`);
  }

  // Expect backend to return { game, review } where review has fields matching ReportReviewDto
  const data = await res.json();
  return data as ReviewWithGameResponse;
}

// ----- Reviews API used by GameDetailsPage -----
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getReviews(gameId: string): Promise<ReviewDto[]> {
  const res = await fetch(`/api/games/${gameId}/reviews`);
  if (!res.ok) {
    throw new Error(`Failed to fetch reviews: ${res.status}`);
  }
  return res.json();
}

export async function postReview(
  gameId: string,
  body: string,
  authorName?: string
): Promise<ReviewDto> {
  const headers: HeadersInit = {
    ...getAuthHeaders(),
  };

  const res = await apiPost(
    `/api/games/${gameId}/reviews`,
    {
      body,
      ...(authorName ? { authorName } : {}),
    },
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Failed to post review: ${res.status}`);
  }

  return res.json();
}

export async function toggleReviewLike(reviewId: string, liked: boolean): Promise<ReviewDto> {
  const headers: HeadersInit = {
    ...getAuthHeaders(),
  };

  const res = await apiPost(
    `/api/reviews/${reviewId}/like`,
    { liked },
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Failed to toggle like: ${res.status}`);
  }

  return res.json();
}

export async function reportReview(
  reviewId: string,
  reasonText: string,
  voiceTranscript?: string
): Promise<void> {
  const headers: HeadersInit = {
    ...getAuthHeaders(),
  };

  const res = await apiPost(
    `/api/reviews/${reviewId}/report`,
    { reasonText, voiceTranscript },
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Failed to submit report: ${res.status}`);
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  const headers: HeadersInit = {
    ...getAuthHeaders(),
  };

  const response = await apiDelete(`/api/reviews/${reviewId}`, { headers });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || 'Failed to delete review');
  }
}

export async function getUserDisplayName(userId: string): Promise<string | null> {
  const headers: HeadersInit = {
    ...getAuthHeaders(),
  };

  const res = await fetch(`/api/users/${userId}`, { headers });
  if (!res.ok) {
    return null;
  }

  const data = await res.json().catch(() => null);
  if (!data) return null;

  const topLevelName = (data.name || data.fullName || data.username) as string | undefined;
  const nestedName =
    (data.user?.name || data.user?.fullName || data.user?.username) as string | undefined;

  return topLevelName?.trim() || nestedName?.trim() || null;
}

export async function addToRecentlyViewed(gameId: string): Promise<void> {
  const headers: HeadersInit = {
    ...getAuthHeaders(),
  };
  const res = await apiPost(`/api/recently-viewed/${gameId}`, undefined, { headers });
  if (!res.ok) {
    throw new Error(`Failed to add to recently viewed: ${res.status}`);
  }
}

export async function getRecentlyViewed(): Promise<RecentlyViewedResponse> {
  const headers: HeadersInit = {
    ...getAuthHeaders(),
  };
  const res = await fetch('/api/recently-viewed', { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch recently viewed: ${res.status}`);
  }
  return res.json();
}

export async function clearRecentlyViewed(): Promise<void> {
  const headers: HeadersInit = {
    ...getAuthHeaders(),
  };
  const res = await apiDelete('/api/recently-viewed', { headers });
  if (!res.ok) {
    throw new Error(`Failed to clear recently viewed: ${res.status}`);
  }
}