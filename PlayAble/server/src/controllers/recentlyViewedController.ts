import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import UserModel, { IUser } from '../models/user';
import GameModel, { IGame } from '../models/game';

const MAX_RECENTLY_VIEWED = 50;

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
    const games = (await GameModel.find({ _id: { $in: ids } }).lean()) as IGame[];

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
