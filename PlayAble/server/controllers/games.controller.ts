import { Request, Response, NextFunction } from 'express';
import { getPaginatedGames, getAllGamesForAdmin, getGameById, createGame, updateGame, deleteGame } from '../services/games.service';
import { parseGamesQuery } from '../utils/validate';
import { IGame } from '../src/models';

/**
 * Converts a Game model document to a clean DTO for API responses.
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
    updatedAt: (game as any).updatedAt ?? null,  };
}

/**
 * HTTP handler for retrieving paginated games with filtering and sorting.
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
    next(err);  }
}

/**
 * HTTP handler for retrieving all games for admin management.
 */
export async function getAdminGamesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const games = await getAllGamesForAdmin();
    return res.json({ games: games.map(toGameDto) });
  } catch (err) {
    next(err);  }
}

/**
 * HTTP handler for retrieving a single game by ID.
 */
export async function getGameByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const game = await getGameById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    return res.json({ game: toGameDto(game as any) });
  } catch (err) {
    next(err);  }
}

/**
 * HTTP handler for creating a new game.
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
