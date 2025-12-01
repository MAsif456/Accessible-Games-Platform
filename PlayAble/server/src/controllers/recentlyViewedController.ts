import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import UserModel, { IUser } from '../models/user';
import GameModel, { IGame } from '../models/game';

/**
 * Maximum number of games to track in recently viewed history per user.
 * @constant {number}
 */
const MAX_RECENTLY_VIEWED = 50;

/**
 * Adds a game to the user's recently viewed history.
 *
 * @param {Request} req - Express request with gameId in params and authenticated user
 * @param {Response} res - Express response
 * @returns {Promise<Response>} JSON response with updated recently viewed array or error
 *
 * @description
 * Tracks when a user views a game by adding it to their recently viewed history.
 * If the game was previously viewed, it's moved to the front of the list.
 * Maintains a maximum of 50 most recent games.
 *
 * **Data Flow:**
 * 1. Validates user authentication
 * 2. Validates game ID format
 * 3. Removes any existing entry for this game
 * 4. Adds game to the front of the array with current timestamp
 * 5. Limits array to MAX_RECENTLY_VIEWED entries
 *
 * **Side Effects:**
 * - Updates user document in database
 * - Most recently viewed game always appears first
 *
 * @security Requires JWT authentication
 *
 * @example
 * POST /api/recently-viewed/:gameId
 * Response: { recentlyViewed: [{ gameId: '...', viewedAt: '2024-01-01T00:00:00.000Z' }, ...] }
 */
export async function addToRecentlyViewed(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id as string | undefined;
    const { gameId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorised' });
    }

    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({ message: 'Invalid game id' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const gameObjectId = new mongoose.Types.ObjectId(gameId);

    // Ensure array exists
    const current: { gameId: mongoose.Types.ObjectId; viewedAt: Date }[] =
      (user as any).recentlyViewed || [];

    // Filter out existing entry for this game
    const filtered = current.filter(entry => !entry.gameId.equals(gameObjectId));

    // Add new entry at the front
    const updated = [
      { gameId: gameObjectId, viewedAt: new Date() },
      ...filtered,
    ].slice(0, MAX_RECENTLY_VIEWED);

    (user as any).recentlyViewed = updated as any;
    await user.save();

    return res.json({ recentlyViewed: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to update recently viewed' });
  }
}

/**
 * Retrieves the user's recently viewed games with full game details.
 *
 * @param {Request} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @returns {Promise<Response>} JSON response with games array and metadata
 *
 * @description
 * Fetches the user's recently viewed history and populates it with full game data.
 * Games are returned in reverse chronological order (most recent first).
 *
 * **Data Flow:**
 * 1. Validates user authentication
 * 2. Retrieves user's recentlyViewed array
 * 3. Fetches full game documents for all IDs
 * 4. Orders games by viewedAt timestamp (newest first)
 * 5. Maps to DTOs with both 'id' and '_id' fields for compatibility
 *
 * **Response Format:**
 * ```json
 * {
 *   "games": [...],
 *   "total": 15,
 *   "showing": "1-15 of 15"
 * }
 * ```
 *
 * @security Requires JWT authentication
 *
 * @example
 * GET /api/recently-viewed
 */
export async function getRecentlyViewed(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorised' });
    }

    const user = (await UserModel.findById(userId).lean()) as (IUser & {
      recentlyViewed?: { gameId: Types.ObjectId; viewedAt: Date }[];
    }) | null;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const entries = user.recentlyViewed || [];

    if (!entries.length) {
      return res.json({ games: [], total: 0, showing: '0 of 0' });
    }

    const ids = entries.map(e => e.gameId);
    const games = (await GameModel.find({ _id: { $in: ids } }).lean()) as unknown as IGame[];
    const gameById = new Map<string, IGame>();
    games.forEach(g => gameById.set((g as any)._id.toString(), g));

    const orderedGames = entries
      .slice()
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
      .map(entry => gameById.get(entry.gameId.toString()))
      .filter(Boolean) as IGame[];

    // Map to DTOs consistent with other game endpoints: include both id and _id
    const gamesDto = orderedGames.map(g => ({
      ...(g as any),
      id: ((g as any)._id ?? (g as any).id)?.toString(),
      _id: ((g as any)._id ?? (g as any).id)?.toString(),
    }));

    const total = gamesDto.length;
    const showing = `1-${total} of ${total}`;

    return res.json({ games: gamesDto, total, showing });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to load recently viewed' });
  }
}

/**
 * Clears all games from the user's recently viewed history.
 *
 * @param {Request} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @returns {Promise<Response>} Success confirmation message
 *
 * @description
 * Permanently removes all entries from the user's recently viewed history.
 * This action cannot be undone.
 *
 * **Side Effects:**
 * - Sets recentlyViewed array to empty in user document
 * - Saves updated user document to database
 *
 * @security Requires JWT authentication
 *
 * @example
 * DELETE /api/recently-viewed
 * Response: { message: 'Recently viewed history cleared' }
 */
export async function clearRecentlyViewed(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorised' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    (user as any).recentlyViewed = [];
    await user.save();

    return res.json({ message: 'Recently viewed history cleared' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to clear recently viewed history' });
  }
}
