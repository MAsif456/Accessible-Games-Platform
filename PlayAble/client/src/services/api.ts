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
  gameId: string;
  userId: string;
  authorName: string;
  body: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
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
  return data;
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
