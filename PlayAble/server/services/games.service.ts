import { FilterQuery, SortOrder } from 'mongoose';
import { IGame, GameModel } from '../src/models';
import { GamesFilterQuery } from '../utils/validate';
import GamesRepository from '../src/repositories/games.repository';

/**
 * Represents the result of a paginated games query.
 * @interface PaginatedGamesResult
 * @property {IGame[]} games - Array of game documents matching the query
 * @property {number} currentPage - Current page number (1-indexed)
 * @property {number} pageSize - Number of items per page
 * @property {number} totalResults - Total number of games matching the filter
 * @property {number} totalPages - Total number of pages available
 */
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

/**
 * Build Mongo filter for public games listing.
/**
 * Builds a MongoDB filter query from user-provided search criteria.
 *
 * @param {GamesFilterQuery} query - The filter query parameters from the user
 * @returns {FilterQuery<IGame>} MongoDB filter object for querying games
 *
 * @description
 * Constructs a filter that:
 * - Only includes published games
 * - Searches across title, description, genres, and accessibility tags when a search term is provided
 * - Filters by genres using $all operator (requires all specified genres)
 * - Filters by accessibility tags using $all operator
 *
 * @example
 * const filter = buildGamesFilter({ search: 'adventure', genres: ['RPG'], tags: ['Visual: Subtitles'] });
 * // Returns: { isPublished: true, $or: [...], genres: { $all: ['RPG'] }, accessibilityTags: { $all: ['Visual: Subtitles'] } }
 */
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

/**
 * Builds a MongoDB sort object based on the sort option provided.
 *
 * @param {GamesFilterQuery['sort']} sort - Optional sort parameter
 * @returns {Record<string, SortOrder>} MongoDB sort object
 *
 * @description
 * Supported sort options:
 * - 'title_desc': Alphabetical descending
 * - 'newest': Newest release year first, then by title
 * - 'oldest': Oldest release year first, then by title
 * - Default: Alphabetical ascending by title
 *
 * @example
 * buildSort('newest') // Returns: { releaseYear: -1, title: 1 }
 */
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

/**
 * Retrieves a paginated list of published games with optional filtering and sorting.
 *
 * @param {GamesFilterQuery} query - Filter, sort, and pagination parameters
 * @returns {Promise<PaginatedGamesResult>} Paginated games with metadata
 *
 * @description
 * This function handles all game browsing logic for the public-facing game catalog.
 * It supports:
 * - Full-text search across multiple fields
 * - Genre and accessibility tag filtering
 * - Multiple sort options
 * - Pagination with configurable page size
 *
 * If the search term is marked as '__MATCH_NOTHING__' (invalid input), returns empty results.
 *
 * @example
 * const result = await getPaginatedGames({
 *   search: 'adventure',
 *   genres: ['RPG'],
 *   sort: 'newest',
 *   page: 1,
 *   pageSize: 12
 * });
 * console.log(result.games); // Array of game documents
 * console.log(result.totalPages); // Total pages available
 */
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

  const repository = GamesRepository;
  const [totalResults, games] = await Promise.all([
    repository.countDocuments(filter),
    repository.findAll(filter, sort, skip, pageSize),
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

/**
 * Return distinct metadata (genres, accessibility tags, release years) for filters.
 * Uses a short-lived cache to reduce DB load.
 */
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

/**
 * Retrieves all games for admin management (includes unpublished games).
 *
 * @returns {Promise<IGame[]>} All games sorted alphabetically by title
 *
 * @description
 * Used exclusively by admin dashboard to list all games regardless of publication status.
 * Games are sorted alphabetically for easy management.
 *
 * @security Only accessible to authenticated admin users via protected routes
 */
export async function getAllGamesForAdmin() {
  const repository = GamesRepository;
  const games = await repository.findAll({}, { title: 1 });
  return games;
}

/**
 * Retrieves a single game by its MongoDB ObjectId.
 *
 * @param {string} id - The MongoDB ObjectId of the game
 * @returns {Promise<IGame | null>} The game document or null if not found
 *
 * @description
 * Used for fetching game details for both public and admin views.
 * Returns null if the game doesn't exist.
 *
 * @example
 * const game = await getGameById('507f1f77bcf86cd799439011');
 */
export async function getGameById(id: string) {
  const repository = GamesRepository;
  return repository.findById(id);
}

/**
 * Input data structure for creating or updating games via admin API.
 *
 * @interface AdminGameInput
 * @property {string} slug - URL-friendly identifier for the game
 * @property {string} title - Full title of the game
 * @property {string} studio - Developer or studio name
 * @property {string} description - Full game description
 * @property {string} thumbnailUrl - URL or data URI for the cover image
 * @property {string[]} genres - Array of genre names
 * @property {string[]} accessibilityTags - Array of formatted accessibility features (e.g., "Visual: Subtitles")
 * @property {number} [releaseYear] - Optional release year
 * @property {boolean} [isPublished] - Optional publication status (defaults to true)
 */
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

/**
 * Creates a new game in the database.
 *
 * @param {AdminGameInput} input - Game data to create
 * @returns {Promise<IGame>} The newly created game document
 *
 * @description
 * Creates a new game with the provided data. If isPublished is not specified,
 * defaults to true. The game is immediately saved to the database.
 *
 * @throws {Error} If validation fails or database operation fails
 *
 * @security Only accessible to authenticated admin users
 *
 * @example
 * const newGame = await createGame({
 *   slug: 'celeste',
 *   title: 'Celeste',
 *   studio: 'Maddy Makes Games',
 *   description: 'A challenging platformer about climbing a mountain',
 *   thumbnailUrl: 'https://example.com/celeste.jpg',
 *   genres: ['Platformer', 'Indie'],
 *   accessibilityTags: ['Motor: Assist Mode', 'Visual: High Contrast'],
 *   releaseYear: 2018
 * });
 */
export async function createGame(input: AdminGameInput): Promise<IGame> {
  const repository = GamesRepository;
  const game = await repository.create({
    ...input,
    isPublished: input.isPublished ?? true,
  });
  return game;
}

/**
 * Updates an existing game with partial data.
 *
 * @param {string} id - MongoDB ObjectId of the game to update
 * @param {Partial<AdminGameInput>} input - Partial game data to update
 * @returns {Promise<IGame | null>} Updated game document or null if not found
 *
 * @description
 * Updates only the fields provided in the input object. Uses MongoDB's $set operator
 * to perform a partial update. Validators run on the updated fields to ensure data integrity.
 *
 * @throws {Error} If validation fails or database operation fails
 *
 * @security Only accessible to authenticated admin users
 *
 * @example
 * const updatedGame = await updateGame('507f1f77bcf86cd799439011', {
 *   title: 'Updated Title',
 *   description: 'New description'
 * });
 */
export async function updateGame(id: string, input: Partial<AdminGameInput>): Promise<IGame | null> {
  const repository = GamesRepository;
  const game = await repository.update(id, { $set: input });
  return game;
}

/**
 * Permanently deletes a game from the database.
 *
 * @param {string} id - MongoDB ObjectId of the game to delete
 * @returns {Promise<void>}
 *
 * @description
 * Permanently removes a game from the database. This action cannot be undone.
 * Consider implementing soft deletes (setting isPublished to false) for production systems.
 *
 * @security Only accessible to authenticated admin users
 *
 * @example
 * await deleteGame('507f1f77bcf86cd799439011');
 */
export async function deleteGame(id: string): Promise<void> {
  const repository = GamesRepository;
  await repository.delete(id);
}
