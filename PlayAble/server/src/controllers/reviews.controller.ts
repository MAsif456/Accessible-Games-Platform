import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Review from '../models/review';
import User from '../models/user';
import Game from '../models/game';
import { createNotification } from '../services/notificationService';

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

    // Get all unique user IDs from reviews
    const allUserIds = Array.from(
      new Set(
        reviews
          .map(r => r.userId?.toString())
          .filter(Boolean) as string[]
      )
    );

    // Fetch all users from database to get their actual names
    let userNameMap: Record<string, string> = {};
    if (allUserIds.length > 0) {
      const users = await User.find({ _id: { $in: allUserIds } })
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

    // Always use the name from the database, overriding any stored authorName
    const hydrated = reviews.map(review => {
      const userIdStr = review.userId?.toString();
      const dbAuthorName = userIdStr ? userNameMap[userIdStr] : null;
      
      // Use database name if available, otherwise keep existing authorName, fallback to Anonymous
      const finalAuthorName = dbAuthorName || review.authorName?.trim() || 'Anonymous';
      
      return { ...review, authorName: finalAuthorName };
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

    // Fetch the actual user from the database to get their name
    const dbUser = await User.findById(user.id).select('name email').lean();
    if (!dbUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get author name from database, fallback to email, then Anonymous
    const authorName = (dbUser as any).name?.trim() || (dbUser as any).email?.trim() || 'Anonymous';

    // Fetch game details for notification
    const game = await Game.findById(gameId).select('title slug').lean();
    const gameTitle = (game as any)?.title || 'the game';
    const gameSlug = (game as any)?.slug;

    const review = await Review.create({
      gameId,
      userId: user.id,
      authorName,
      body: trimmedBody,
      likes: 0,
    });

    // Create notification for the user confirming their review was created
    try {
      await createNotification(
        user.id,
        'review_created',
        'Review Posted Successfully',
        `Your review for "${gameTitle}" has been posted successfully.`,
        {
          reviewId: review._id.toString(),
          gameId: gameId,
          metadata: {
            reviewContent: trimmedBody.substring(0, 100),
            gameTitle,
            gameSlug,
          },
        }
      );
    } catch (notifError) {
      // Don't fail review creation if notification creation fails
      console.error('Error creating notification for review creation', notifError);
    }

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

    // Fetch the user from database to get their actual name
    let authorName = 'Anonymous';
    if (review.userId) {
      const user = await User.findById(review.userId).select('name email').lean();
      if (user) {
        const name = (user as any).name?.trim();
        const email = (user as any).email?.trim();
        authorName = name || email || 'Anonymous';
      }
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
        author: authorName,
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
export const getReviewStats = async (req: Request, res: Response) => {
  try {
    const totalReviews = await Review.countDocuments({});
    res.json({ totalReviews });
  } catch (error) {
    console.error('Error fetching review stats', error);
    res.status(500).json({ message: 'Failed to fetch review stats' });
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
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
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
          // Get author name from user document, fallback to stored authorName, then Anonymous
          authorName: {
            $ifNull: [
              { $arrayElemAt: ['$user.name', 0] },
              {
                $ifNull: [
                  { $arrayElemAt: ['$user.email', 0] },
                  {
                    $ifNull: ['$authorName', 'Anonymous']
                  }
                ]
              }
            ]
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
    const { reason } = (req.body as { reason?: string }) || {};
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await Review.findById(id).populate('gameId', 'title slug').lean();
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Extract userId - handle both ObjectId and string formats
    let reviewUserId: string | null = null;
    if (review.userId) {
      if (typeof review.userId === 'string') {
        reviewUserId = review.userId;
      } else if (review.userId instanceof mongoose.Types.ObjectId) {
        reviewUserId = review.userId.toString();
      } else if ((review.userId as any).toString) {
        reviewUserId = (review.userId as any).toString();
      }
    }

    const reviewContent = review.body?.substring(0, 100) || 'your review';
    const gameTitle = (review.gameId as any)?.title || 'the game';
    const gameSlug = (review.gameId as any)?.slug;
    let gameId: string | null = null;
    if (review.gameId) {
      if (typeof review.gameId === 'string') {
        gameId = review.gameId;
      } else if (review.gameId instanceof mongoose.Types.ObjectId) {
        gameId = review.gameId.toString();
      } else if ((review.gameId as any).toString) {
        gameId = (review.gameId as any).toString();
      }
    }

    // Create notification for the review author BEFORE deleting
    if (reviewUserId) {
      try {
        console.log(`[adminDeleteReview] Creating notification: userId=${reviewUserId}, reviewId=${id}, gameTitle=${gameTitle}`);
        
        await createNotification(
          reviewUserId,
          'review_deleted',
          'Your Review Has Been Deleted',
          `Your review has been deleted by an administrator.`,
          {
            reviewId: id,
            gameId: gameId ? new mongoose.Types.ObjectId(gameId) : undefined,
            metadata: {
              reviewContent,
              deletionReason: reason || undefined,
              adminName: 'Administrator',
              gameTitle,
              gameSlug,
            },
          }
        );
        console.log(`[adminDeleteReview] Notification created successfully for userId=${reviewUserId}`);
      } catch (notifError) {
        console.error('[adminDeleteReview] Error creating notification:', notifError);
        console.error('[adminDeleteReview] Error details:', {
          reviewUserId,
          reviewId: id,
          gameId,
          error: notifError instanceof Error ? notifError.message : String(notifError),
        });
      }
    } else {
      console.warn(`[adminDeleteReview] No userId found for review ${id}`);
    }

    // Delete the review after notification is created
    await Review.findByIdAndDelete(id);

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
