import { Request, Response, NextFunction } from 'express';
import { getPaginatedGames } from '../services/games.service';
import { parseGamesQuery } from '../utils/validate';
import { IGame } from '../src/models';

function normalizeSpecificAccessibilityTags(
  tags: IGame['specificAccessibilityTags']
): Record<string, string[]> | null {
  if (!tags) return null;
  let raw: any = tags;
  if (raw instanceof Map) {
    raw = Object.fromEntries(raw.entries());
  }
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const normalized: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value) && value.length) {
      normalized[key] = value;
    } else if (Array.isArray(value)) {
      normalized[key] = value;
    }
  }
  return Object.keys(normalized).length ? normalized : null;
}

// Adapter/DTO to shape the Game document for API responses
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
    specificAccessibilityTags: normalizeSpecificAccessibilityTags(game.specificAccessibilityTags),
    releaseYear: game.releaseYear ?? null,
    isPublished: game.isPublished,
    createdAt: (game as any).createdAt ?? null,
    updatedAt: (game as any).updatedAt ?? null,
  };
}

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
