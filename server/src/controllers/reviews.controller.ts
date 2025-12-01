import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Review from '../models/review';
import User from '../models/user';
import Game from '../models/game';

type AuthedRequest = Request & {
  user?: {
    id: string;
    name?: string;
    email?: string;
  };
};

export const listReviews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid game ID' });
    }

    const reviews = await Review.find({ gameId: id }).sort({ createdAt: -1 }).lean();

    // Backfill author names for any legacy reviews that were stored as "Anonymous" or blank.
    const missingNameUserIds = Array.from(
      new Set(
        reviews
          .filter(r => !r.authorName?.trim() || r.authorName.toLowerCase() === 'anonymous')
          .map(r => r.userId?.toString())
          .filter(Boolean) as string[]
      )
    );

    let userNameMap: Record<string, string> = {};
    if (missingNameUserIds.length) {
      const users = await User.find({ _id: { $in: missingNameUserIds } })
        .select('name email')
        .lean();

      const typedUsers = users as Array<{ _id: mongoose.Types.ObjectId; name?: unknown; email?: unknown }>;

      userNameMap = typedUsers.reduce((acc, u) => {
        const name = typeof u.name === 'string' ? u.name.trim() : '';
        const email = typeof u.email === 'string' ? u.email.trim() : '';
        acc[String(u._id)] = name || email || 'Anonymous';
        return acc;
      }, {} as Record<string, string>);
    }

    const hydrated = reviews.map(review => {
      if (!review.authorName?.trim() || review.authorName.toLowerCase() === 'anonymous') {
        const resolved = userNameMap[review.userId?.toString()];
        if (resolved) {
          return { ...review, authorName: resolved };
        }
      }
      return review;
    });

    res.json(hydrated);
  } catch (error) {
    console.error('Error listing reviews', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};

export const createReview = async (req: AuthedRequest, res: Response) => {
  try {
    const { id: gameId } = req.params as { id: string };
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({ message: 'Invalid game ID' });
    }

    const { body } = req.body as { body?: string };

    if (!body || typeof body !== 'string' || body.trim().length < 10) {
      return res
        .status(400)
        .json({ message: 'Review text must be at least 10 characters long.' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Authentication required to post a review.' });
    }

    const trimmedBody = body.trim();

    // Prefer a meaningful author display name from the user model, only falling back
    // to 'Anonymous' if there is genuinely no name or email available.
    const authorName = user.name?.trim() || user.email?.trim() || 'Anonymous';

    const review = await Review.create({
      gameId,
      userId: user.id,
      authorName,
      body: trimmedBody,
      likes: 0,
    });

    return res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review', error);
    return res.status(500).json({ message: 'Failed to create review.' });
  }
};

export const getReviewById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await Review.findById(id).lean();
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Fetching the associated game so the reporting UI can show full context
    const game = await Game.findById(review.gameId).lean();
    if (!game) {
      return res.status(404).json({ message: 'Game not found for this review' });
    }

    return res.json({
      game,
      review: {
        id: (review as any).publicId || review._id.toString(),
        author: review.authorName,
        createdAt: review.createdAt,
        content: review.body,
      },
    });
  } catch (error) {
    console.error('Error fetching review', error);
    res.status(500).json({ message: 'Failed to fetch review' });
  }
};

export const toggleReviewLike = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Simple toggle: if client says "like", increment; if "unlike", decrement.
    const { liked } = req.body as { liked?: boolean };
    if (typeof liked !== 'boolean') {
      return res.status(400).json({ message: 'liked boolean is required' });
    }

    review.likes = Math.max(0, review.likes + (liked ? 1 : -1));
    await review.save();

    res.json(review.toObject());
  } catch (error) {
    console.error('Error toggling review like', error);
    res.status(500).json({ message: 'Failed to toggle like' });
  }
};

export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as AuthedRequest).user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.userId.toString() !== user.id) {
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    }

    await review.deleteOne();
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting review', error);
    res.status(500).json({ message: 'Failed to delete review' });
  }
};

export const adminListReviews = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt((req.query.pageSize as string) || '10', 10), 1),
      50
    );
    const search = (req.query.search as string | undefined)?.trim().toLowerCase();

    const searchRegex = search ? new RegExp(search, 'i') : null;
    const searchObjectId =
      search && mongoose.Types.ObjectId.isValid(search) ? new mongoose.Types.ObjectId(search) : null;

    const basePipeline: any[] = [
      {
        $lookup: {
          from: 'games',
          localField: 'gameId',
          foreignField: '_id',
          as: 'game',
        },
      },
      { $unwind: '$game' },
      {
        $addFields: {
          friendlyId: {
            $ifNull: [
              '$publicId',
              {
                $concat: ['rev_', { $substrCP: [{ $toString: '$_id' }, 0, 8] }],
              },
            ],
          },
        },
      },
    ];

    const searchMatch: any[] = [];
    if (searchRegex) {
      searchMatch.push(
        { body: { $regex: searchRegex } },
        { authorName: { $regex: searchRegex } },
        { friendlyId: { $regex: searchRegex } },
        { 'game.title': { $regex: searchRegex } },
        { 'game.slug': { $regex: searchRegex } }
      );
    }
    if (searchObjectId) {
      searchMatch.push({ _id: searchObjectId });
    }
    if (searchMatch.length) {
      basePipeline.push({ $match: { $or: searchMatch } });
    }

    basePipeline.push({ $sort: { createdAt: -1 } });

    const projection = {
      _id: 1,
      publicId: '$friendlyId',
      gameId: 1,
      userId: 1,
      authorName: 1,
      body: 1,
      likes: 1,
      createdAt: 1,
      updatedAt: 1,
      adminReply: 1,
      gameTitle: '$game.title',
      gameSlug: '$game.slug',
    };

    const [items, countResult] = await Promise.all([
      Review.aggregate([
        ...basePipeline,
        { $skip: (page - 1) * pageSize },
        { $limit: pageSize },
        { $project: projection },
      ]),
      Review.aggregate([...basePipeline, { $count: 'total' }]),
    ]);

    const total = countResult[0]?.total || 0;

    return res.json({
      items,
      page,
      pageSize,
      total,
    });
  } catch (error) {
    console.error('Error listing admin reviews', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};

export const adminDeleteReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await review.deleteOne();
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting review (admin)', error);
    res.status(500).json({ message: 'Failed to delete review' });
  }
};

export const adminReplyToReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reply } = req.body as { reply?: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    if (!reply || typeof reply !== 'string') {
      return res.status(400).json({ message: 'Reply is required.' });
    }

    const trimmed = reply.trim();
    const min = 5;
    const max = 500;

    if (trimmed.length < min) {
      return res
        .status(400)
        .json({ message: `Reply must be at least ${min} characters long.` });
    }

    if (trimmed.length > max) {
      return res
        .status(400)
        .json({ message: `Reply must be at most ${max} characters long.` });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.adminReply = trimmed;
    await review.save();

    return res.status(200).json(review.toObject());
  } catch (error) {
    console.error('Error sending admin reply to review', error);
    res.status(500).json({ message: 'Failed to send reply' });
  }
};

