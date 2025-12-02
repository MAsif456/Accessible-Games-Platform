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
  specificAccessibilityTags?: Record<string, string[]>;
  releaseYear?: number;
}

export interface PaginatedGamesResponse {
  games: GameDto[];
  currentPage: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
}

export interface ReviewDto {
  _id: string;
  publicId?: string;
  gameId: string;
  userId: string;
  authorName: string;
  body: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStatsDto {
  totalReviews: number;
}

const FALLBACK_GAMES: GameDto[] = [
  {
    id: 'fallback-1',
    _id: 'fallback-1',
    slug: 'fallback-game',
    title: 'Fallback Adventure',
    studio: 'Fallback Studio',
    description: 'An offline showcase game used when the API is unavailable.',
    thumbnailUrl: '/images/games/fallback.jpg',
    genres: ['Adventure'],
    accessibilityTags: ['Vision', 'Motor'],
    specificAccessibilityTags: {
      Vision: ['High Contrast Mode', 'Customisable UI Scale'],
      Motor: ['Assist Mode', 'Remappable Controls'],
    },
    releaseYear: 2024,
  },
];

const FALLBACK_REVIEWS: ReviewDto[] = [
  {
    _id: 'fallback-review-1',
    publicId: 'REV-FALLBACK',
    gameId: 'fallback-1',
    userId: 'fallback-user-1',
    authorName: 'Offline Tester',
    body: 'This review is shown when the API cannot be reached.',
    likes: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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

  try {
    const data: PaginatedGamesResponse = await res.json();
    if (Array.isArray(data?.games) && data.games.length) {
      return data;
    }
  } catch {
    // Swallow parsing errors and fall through to fallback payload.
  }

  return {
    games: FALLBACK_GAMES,
    currentPage: 1,
    pageSize: FALLBACK_GAMES.length,
    totalResults: FALLBACK_GAMES.length,
    totalPages: 1,
  };
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getReviews(gameId: string): Promise<ReviewDto[]> {
  const res = await fetch(`/api/games/${gameId}/reviews`);
  if (!res.ok) {
    throw new Error(`Failed to fetch reviews: ${res.status}`);
  }
  try {
    const data = await res.json();
    return Array.isArray(data) && data.length ? data : FALLBACK_REVIEWS;
  } catch {
    return FALLBACK_REVIEWS;
  }
}

/**
 * Fetches aggregate review statistics for the admin dashboard.
 */
export async function getReviewStats(): Promise<ReviewStatsDto> {
  const res = await fetch('/api/reviews/stats');
  if (!res.ok) {
    throw new Error(`Failed to fetch review stats: ${res.status}`);
  }
  return res.json();
}

export async function getReviewById(reviewId: string): Promise<ReviewDto> {
  const res = await fetch(`/api/reviews/${reviewId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch review: ${res.status}`);
  }
  return res.json();
}

export async function postReview(
  gameId: string,
  body: string,
  authorName?: string
): Promise<ReviewDto> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`/api/games/${gameId}/reviews`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      body,
      // Include authorName so the backend can persist the reviewer display name for all viewers
      ...(authorName ? { authorName } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to post review: ${res.status}`);
  }
  return res.json();
}

export async function toggleReviewLike(reviewId: string, liked: boolean): Promise<ReviewDto> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`/api/reviews/${reviewId}/like`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ liked }),
  });
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
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`/api/reviews/${reviewId}/report`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reasonText, voiceTranscript }),
  });
  if (!res.ok) {
    throw new Error(`Failed to submit report: ${res.status}`);
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const response = await fetch(`/api/reviews/${reviewId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || 'Failed to delete review');
  }
}

/**
 * Fetch the display name for a given user. Returns null if unavailable.
 * This helps fill in missing author names on reviews for all viewers.
 */
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

  // Support common response shapes { name } or { fullName } or nested { user: { name } }
  const topLevelName = (data.name || data.fullName || data.username) as string | undefined;
  const nestedName =
    (data.user?.name || data.user?.fullName || data.user?.username) as string | undefined;

  return topLevelName?.trim() || nestedName?.trim() || null;
}
