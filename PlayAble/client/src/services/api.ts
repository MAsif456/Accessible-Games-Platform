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

// New types for review details used on the report pages
export interface ReviewDto {
  id: string;
  author: string;
  createdAt: string;
  content: string;
}

export interface ReviewWithGameResponse {
  game: GameDto;
  review: ReviewDto;
}

// Fetch a single game by ID
export async function getGameById(gameId: string): Promise<GameDto> {
  const res = await fetch(`/api/games/${encodeURIComponent(gameId)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch game: ${res.status}`);
  }
  const data: GameDto = await res.json();
  return data;
}

// Fetch a single review by ID, along with its game context
export async function getReviewById(reviewId: string): Promise<ReviewWithGameResponse> {
  const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch review: ${res.status}`);
  }
  const data: ReviewWithGameResponse = await res.json();
  return data;
}
