export interface PaginationQuery {
  page: number;
  pageSize: number;
}

export interface GamesFilterQuery extends PaginationQuery {
  search?: string;
  genres?: string[];
  tags?: string[];
  sort?: 'title_asc' | 'title_desc' | 'newest' | 'oldest';
}

export function parseGamesQuery(query: any): GamesFilterQuery {
  const page = Math.max(parseInt(query.page as string, 10) || 1, 1);

  const rawPageSize = parseInt(query.pageSize as string, 10);
  const pageSize = Math.min(Math.max(rawPageSize || 9, 1), 50);

  const searchRaw =
    typeof query.search === 'string' && query.search.trim() ? query.search.trim() : undefined;

  const isValidSearch = !!searchRaw && /^[a-zA-Z0-9\-\s]{1,50}$/.test(searchRaw);
 
  const sanitizedSearch = isValidSearch ? searchRaw : searchRaw ? '__MATCH_NOTHING__' : undefined;

  const genres =
    typeof query.genres === 'string' && query.genres.trim()
      ? query.genres
          .split(',')
          .map((g: string) => g.trim())
          .filter(Boolean)
      : undefined;

  const tags =
    typeof query.tags === 'string' && query.tags.trim()
      ? query.tags
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean)
      : undefined;

  const allowedSort = ['title_asc', 'title_desc', 'newest', 'oldest'] as const;
  const sort = allowedSort.includes(query.sort as any)
    ? (query.sort as GamesFilterQuery['sort'])
    : 'title_asc';

  return { page, pageSize, search: sanitizedSearch, genres, tags, sort };
}
