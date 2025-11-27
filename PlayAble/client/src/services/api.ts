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

export async function postReview(gameId: string, body: string): Promise<ReviewDto> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const res = await fetch(`/api/games/${gameId}/reviews`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ body }),
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
