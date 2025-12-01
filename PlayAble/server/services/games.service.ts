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

export interface GamesMetadata {
  genres: string[];
  accessibilityTags: string[];
  releaseYears: number[];
}

const METADATA_TTL_MS = 5 * 60 * 1000;
let metadataCache: { value: GamesMetadata | null; expiresAt: number } = {
  value: null,
  expiresAt: 0,
};

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

export function resetGamesMetadataCache() {
  metadataCache = { value: null, expiresAt: 0 };
}

export async function getGamesMetadata(options: { useCache?: boolean } = {}): Promise<GamesMetadata> {
  const useCache = options.useCache !== false;
  const now = Date.now();

  if (useCache && metadataCache.value && metadataCache.expiresAt > now) {
    return metadataCache.value;
  }

  const [genres, accessibilityTags, releaseYears] = await Promise.all([
    GameModel.distinct('genres', { isPublished: true }),
    GameModel.distinct('accessibilityTags', { isPublished: true }),
    GameModel.distinct('releaseYear', { isPublished: true, releaseYear: { $ne: null } }),
  ]);

  const safeGenres = (genres as string[]).filter(Boolean).sort();
  const safeAccessibility = (accessibilityTags as string[]).filter(Boolean).sort();
  const safeYears = (releaseYears as number[]).filter(Boolean).sort((a, b) => b - a);

  const result: GamesMetadata = {
    genres: safeGenres,
    accessibilityTags: safeAccessibility,
    releaseYears: safeYears,
  };

  if (useCache) {
    metadataCache = { value: result, expiresAt: now + METADATA_TTL_MS };
  }

  return result;
}

export async function getAllGamesForAdmin() {
  const games = await GameModel.find({}).sort({ title: 1 }).exec();
  return games;
}

export async function getGameById(id: string) {
  return GameModel.findById(id).exec();
}

export interface AdminGameInput {
  slug: string;
  title: string;
  studio: string;
  description: string;
  thumbnailUrl: string;
  genres: string[];
  accessibilityTags: string[];
  releaseYear?: number;
  isPublished?: boolean;
}

export async function createGame(input: AdminGameInput): Promise<IGame> {
  const game = new GameModel({
    ...input,
    isPublished: input.isPublished ?? true,
  });
  await game.save();
  return game;
}

export async function updateGame(id: string, input: Partial<AdminGameInput>): Promise<IGame | null> {
  const game = await GameModel.findByIdAndUpdate(
    id,
    { $set: input },
    { new: true, runValidators: true },
  ).exec();
  return game;
}

export async function deleteGame(id: string): Promise<void> {
  await GameModel.findByIdAndDelete(id).exec();
}
