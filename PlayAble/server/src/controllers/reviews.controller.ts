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

/**
 * Public: list all reviews for a game (newest first), backfilling missing author names.
 * @param {Request} req Request object with game ID in params.
 * @param {Response} res Response object.
 * @returns {Promise<void>} Promise resolving after sending JSON response.
 */

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


/**
 * Public: create a new review for a game (auth required).
 * @param {AuthedRequest} req Request object with user data.
 * @param {Response} res Response object.
 * @returns {Promise<void>} Promise resolving after creation.
 */
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


/**
 * Public: fetch a single review by its ID, along with its game context, for the reporting page.
 * @param {Request} req Request object
 * @param {Response} res Response object
 * @returns {Promise<void>} Promise resolving after deletion
 */
/**
 * Response shape:
 * {
 *   game: {
 *     id: string,
 *     title: string,
 *     description: string,
 *     categories: string[]
 *   },
 *   review: {
 *     id: string,
 *     author: string,
 *     createdAt: Date,
 *     content: string
 *   }
 * }
 */
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


/**
 * Public: toggle like on a review (idempotent based on client "liked" flag).
 * 
 * @param {Request} req Request object
 * @param {Response} res Response object
 * @returns {Promise<void>} Promise resolving after like toggle
 * 
 * @example
 * const reviewId = '...';
 * const liked = true;
 * const res = await toggleReviewLike({ params: { id: reviewId }, body: { liked } });
 * console.log(res.json());
 */
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


/**
 * Public: delete a review authored by the current user.
 * Requires authentication.
 * @param {Request} req Request object
 * @param {Response} res Response object
 * @returns {Promise<void>} Promise resolving after deletion
 */
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

/**
 * Admin: list reviews (supports resolved/unresolved and search).
 * Returns a list of reviews in the format:
 * {
 *   items: Review[],
 *   page: number,
 *   pageSize: number,
 *   total: number
 * }
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
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

/**
 * Admin: delete a review by its ID.
 * @param {Request} req Request object
 * @param {Response} res Response object
 * @returns {Promise<void>} Promise resolving after deletion
 */
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

/**
 * Admin: reply to a review by its ID.
 * @param {Request} req Request object
 * @param {Response} res Response object
 * @returns {Promise<void>} Promise resolving after reply is sent
 */
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
