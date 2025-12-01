import { Request, Response, NextFunction } from 'express';
import { getPaginatedGames, getAllGamesForAdmin, getGameById, createGame, updateGame, deleteGame } from '../services/games.service';
import { parseGamesQuery } from '../utils/validate';
import { IGame } from '../src/models';

/**
 * Converts a Game model document to a clean DTO for API responses.
 *
 * @param {IGame & { createdAt?: Date; updatedAt?: Date }} game - Game document from MongoDB
 * @returns {Object} Clean game DTO with consistent field names
 *
 * @description
 * Transforms the internal game document structure to a consistent API response format.
 * Extracts the _id field as a string 'id' property and includes all game fields.
 * Ensures timestamp fields are properly exposed as null if not present.
 */
function toGameDto(game: IGame & { createdAt?: Date; updatedAt?: Date }) {
  return {
    id: (game as any)._id?.toString?.() ?? undefined,
    slug: game.slug,
    title: game.title,
    studio: game.studio,
    description: game.description,
    thumbnailUrl: game.thumbnailUrl,
    genres: game.genres,
    accessibilityTags: game.accessibilityTags,
    releaseYear: game.releaseYear ?? null,
    isPublished: game.isPublished,
    createdAt: (game as any).createdAt ?? null,
    updatedAt: (game as any).updatedAt ?? null,
  };
}

/**
 * HTTP handler for retrieving paginated games with filtering and sorting.
 *
 * @param {Request} req - Express request object with query parameters
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response | void>} JSON response with paginated games or passes error to next()
 *
 * @description
 * Public endpoint for browsing the game catalog. Supports:
 * - Search across title, description, genres, and accessibility tags
 * - Filtering by genres and accessibility tags
 * - Sorting by title or release year
 * - Pagination with configurable page size
 *
 * Query parameters are validated and sanitized via parseGamesQuery before processing.
 *
 * @example
 * GET /api/games?search=adventure&genres=RPG&sort=newest&page=1&pageSize=12
 */
export async function getGamesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = parseGamesQuery(req.query);
    const result = await getPaginatedGames(parsed);

    return res.json({
      games: result.games.map(toGameDto),
      currentPage: result.currentPage,
      pageSize: result.pageSize,
      totalResults: result.totalResults,
      totalPages: result.totalPages,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * HTTP handler for retrieving all games for admin management.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response | void>} JSON response with all games or passes error to next()
 *
 * @description
 * Admin-only endpoint that returns all games (including unpublished ones) sorted alphabetically.
 * Used by the admin dashboard to manage the game catalog.
 *
 * @security Requires admin authentication via middleware
 *
 * @example
 * GET /api/admin/games
 */
export async function getAdminGamesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const games = await getAllGamesForAdmin();
    return res.json({ games: games.map(toGameDto) });
  } catch (err) {
    next(err);
  }
}

/**
 * HTTP handler for retrieving a single game by ID.
 *
 * @param {Request} req - Express request object with game ID in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response | void>} JSON response with game data or 404 error
 *
 * @description
 * Retrieves a single game's complete details by its MongoDB ObjectId.
 * Returns 404 if the game doesn't exist.
 *
 * @example
 * GET /api/games/:id or GET /api/admin/games/:id
 */
export async function getGameByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const game = await getGameById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    return res.json({ game: toGameDto(game as any) });
  } catch (err) {
    next(err);
  }
}

/**
 * HTTP handler for creating a new game.
 *
 * @param {Request} req - Express request object with game data in body
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response | void>} JSON response with created game or passes error to next()
 *
 * @description
 * Admin-only endpoint for adding new games to the catalog.
 * Expects all required game fields in the request body.
 *
 * @security Requires admin authentication via middleware
 *
 * @example
 * POST /api/admin/games
 * Body: { slug, title, studio, description, thumbnailUrl, genres, accessibilityTags, releaseYear, isPublished }
 */
export async function createGameHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      slug,
      title,
      studio,
      description,
      thumbnailUrl,
      genres,
      accessibilityTags,
      releaseYear,
      isPublished,
    } = req.body;

    const game = await createGame({
      slug,
      title,
      studio,
      description,
      thumbnailUrl,
      genres,
      accessibilityTags,
      releaseYear,
      isPublished,
    });

    return res.status(201).json({ game: toGameDto(game as any) });
  } catch (err) {
    next(err);
  }
}

/**
 * HTTP handler for updating an existing game.
 *
 * @param {Request} req - Express request object with game ID in params and update data in body
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response | void>} JSON response with updated game or 404 error
 *
 * @description
 * Admin-only endpoint for updating game details. Accepts partial game data
 * and only updates the provided fields. Returns 404 if the game doesn't exist.
 *
 * @security Requires admin authentication via middleware
 *
 * @example
 * PUT /api/admin/games/:id
 * Body: { title: 'Updated Title', description: 'Updated description' }
 */
export async function updateGameHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    const game = await updateGame(id, req.body);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    return res.json({ game: toGameDto(game as any) });
  } catch (err) {
    next(err);
  }
}

/**
 * HTTP handler for deleting a game.
 *
 * @param {Request} req - Express request object with game ID in params
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<Response | void>} 204 No Content response or passes error to next()
 *
 * @description
 * Admin-only endpoint for permanently deleting a game from the catalog.
 * Returns 204 No Content on successful deletion.
 *
 * @security Requires admin authentication via middleware
 *
 * @example
 * DELETE /api/admin/games/:id
 */
export async function deleteGameHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    await deleteGame(id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
