import { FilterQuery, SortOrder } from 'mongoose';
import { GameModel, IGame } from '../src/models';
import { GamesFilterQuery } from '../utils/validate';

export interface PaginatedGamesResult {
  games: IGame[];
  currentPage: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
}

function buildGamesFilter(query: GamesFilterQuery): FilterQuery<IGame> {
  const filter: FilterQuery<IGame> = { isPublished: true };

  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filter.$or = [
      { title: regex },
      { description: regex },
      { genres: regex },
      { accessibilityTags: regex },
    ];
  }

  if (query.genres && query.genres.length > 0) {
    filter.genres = { $all: query.genres };
  }

  if (query.tags && query.tags.length > 0) {
    filter.accessibilityTags = { $all: query.tags };
  }

  return filter;
}

function buildSort(sort?: GamesFilterQuery['sort']): Record<string, SortOrder> {
  switch (sort) {
    case 'title_desc':
      return { title: -1 };
    case 'newest':
      return { releaseYear: -1, title: 1 };
    case 'oldest':
      return { releaseYear: 1, title: 1 };
    case 'title_asc':
    default:
      return { title: 1 };
  }
}

export async function getPaginatedGames(query: GamesFilterQuery): Promise<PaginatedGamesResult> {
  const { search, page, pageSize } = query;

  // If search was marked as invalid, return an empty result set
  if (search === '__MATCH_NOTHING__') {
    return {
      games: [],
      currentPage: page,
      pageSize,
      totalResults: 0,
      totalPages: 1,
    };
  }

  const filter = buildGamesFilter(query);
  const sort = buildSort(query.sort);

  const skip = (page - 1) * pageSize;

  const [totalResults, games] = await Promise.all([
    GameModel.countDocuments(filter),
    GameModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .exec(),
  ]);

  const totalPages = totalResults === 0 ? 1 : Math.ceil(totalResults / pageSize);

  return {
    games,
    currentPage: page,
    pageSize,
    totalResults,
    totalPages,
  };
}
