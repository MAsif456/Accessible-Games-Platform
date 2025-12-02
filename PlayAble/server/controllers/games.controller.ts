import { Request, Response, NextFunction } from 'express';
import {
  getPaginatedGames,
  getAllGamesForAdmin,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
  getGamesMetadata,
} from '../services/games.service';
import { parseGamesQuery } from '../utils/validate';
import { IGame } from '../src/models';

/**
 * Adapter/DTO to shape the Game document for API responses.
 * Keeps API payloads consistent between admin and public endpoints.
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
 * Public games listing with pagination and filters.
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
 * Lightweight metadata (genres, accessibility tags, release years) for filter UI.
 */
export async function getGamesMetadataHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const metadata = await getGamesMetadata();
    return res.json(metadata);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin listing of all games (unpaginated) for management UI.
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
 * Single game fetch by id.
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
 * Admin create game.
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
 * Admin update game.
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
 * Admin delete game.
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
