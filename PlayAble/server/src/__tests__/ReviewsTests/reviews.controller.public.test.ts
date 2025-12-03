import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as reviewsController from '../../controllers/reviews.controller';

const {
  listReviews,
  createReview,
  getReviewById,
  toggleReviewLike,
  deleteReview,
} = reviewsController;
import Review from '../../models/review';
import User from '../../models/user';
import Game from '../../models/game';

jest.mock('../../models/review', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock('../../models/user', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('../../models/game', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const mockReviewModel = Review as unknown as {
  find: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
  findByIdAndDelete: jest.Mock;
};

const mockUserModel = User as unknown as {
  find: jest.Mock;
  findById: jest.Mock;
};

const mockGameModel = Game as unknown as {
  findById: jest.Mock;
};

/**
 * Creates a mock response object for Express route handlers.
 * The mock response object has `status`, `json`, and `send` methods, which
 * all return the mock response object itself, allowing for chaining.
 * @returns {Object} A mock response object for Express route handlers.
 */
const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response & {
    status: jest.Mock;
    json: jest.Mock;
    send: jest.Mock;
  };
};

describe('reviews.controller (public endpoints)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // default user lookup
    const userLean = jest.fn().mockResolvedValue({ name: 'Sam', email: 'sam@example.com' });
    const userSelect = jest.fn().mockReturnValue({ lean: userLean });
    mockUserModel.findById.mockReturnValue({ select: userSelect });

    // default game lookup
    mockGameModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ title: 'Game', slug: 'game' }) }),
      lean: jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(), title: 'Game' }),
    });
  });

  it('returns 400 when listing reviews with invalid game id', async () => {
    const req = { params: { id: 'not-an-id' } } as unknown as Request;
    const res = makeRes();

    await listReviews(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid game ID' });
  });

  it('backfills missing author names when listing reviews', async () => {
    const gameId = new mongoose.Types.ObjectId();
    const missingUserId = new mongoose.Types.ObjectId();
    const reviews = [
      {
        _id: new mongoose.Types.ObjectId(),
        gameId,
        userId: missingUserId,
        authorName: 'Anonymous',
        body: 'Great game',
        createdAt: new Date('2024-01-01'),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        gameId,
        userId: new mongoose.Types.ObjectId(),
        authorName: 'Existing Name',
        body: 'Solid',
        createdAt: new Date('2024-01-02'),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        gameId,
        userId: missingUserId,
        authorName: '   ',
        body: 'Cool',
        createdAt: new Date('2024-01-03'),
      },
    ];

    const reviewLean = jest.fn().mockResolvedValue(reviews);
    const reviewSort = jest.fn().mockReturnValue({ lean: reviewLean });
    mockReviewModel.find.mockReturnValue({ sort: reviewSort });

    const userLean = jest.fn().mockResolvedValue([{ _id: missingUserId, name: 'Real Name' }]);
    const userSelect = jest.fn().mockReturnValue({ lean: userLean });
    mockUserModel.find.mockReturnValue({ select: userSelect });

    const req = { params: { id: gameId.toHexString() } } as unknown as Request;
    const res = makeRes();

    await listReviews(req, res);

    expect(mockReviewModel.find).toHaveBeenCalledWith({ gameId: gameId.toHexString() });
    expect(userSelect).toHaveBeenCalledWith('name email');
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ authorName: 'Real Name' }),
        expect.objectContaining({ authorName: 'Existing Name' }),
      ])
    );
  });

  it('creates a review with trimmed body and derived author name', async () => {
    const gameId = new mongoose.Types.ObjectId().toHexString();
    const createdReview = { _id: new mongoose.Types.ObjectId(), body: 'Hello world', authorName: 'Sam' };
    mockReviewModel.create.mockResolvedValue(createdReview);
    const userLean = jest.fn().mockResolvedValue({ name: 'Sam', email: '' });
    const userSelect = jest.fn().mockReturnValue({ lean: userLean });
    mockUserModel.findById.mockReturnValue({ select: userSelect });

    const req = {
      params: { id: gameId },
      body: { body: '   Hello world   ' },
      user: { id: 'user-1', name: 'Sam', email: '' },
    } as unknown as Request;
    const res = makeRes();

    await createReview(req as any, res);

    expect(mockReviewModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId,
        userId: 'user-1',
        authorName: 'Sam',
        body: 'Hello world',
        likes: 0,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdReview);
  });

  it('fetches review with game context by id', async () => {
    const reviewId = new mongoose.Types.ObjectId();
    const gameId = new mongoose.Types.ObjectId();
    const reviewDoc = {
      _id: reviewId,
      publicId: 'rev_1234',
      authorName: 'Jane',
      gameId,
      userId: new mongoose.Types.ObjectId(),
      body: 'Content',
      createdAt: new Date(),
    };
    mockReviewModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(reviewDoc) });
    mockGameModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: gameId, title: 'Game' }) });
    const userSelect = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ name: 'Jane', email: '' }) });
    mockUserModel.findById.mockReturnValue({ select: userSelect });

    const req = { params: { id: reviewId.toHexString() } } as unknown as Request;
    const res = makeRes();

    await getReviewById(req, res);

    expect(mockReviewModel.findById).toHaveBeenCalledWith(reviewId.toHexString());
    expect(mockGameModel.findById).toHaveBeenCalledWith(gameId);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        game: expect.objectContaining({ title: 'Game' }),
        review: expect.objectContaining({ id: 'rev_1234', author: 'Jane', content: 'Content' }),
      })
    );
  });

  it('toggles likes up and down safely', async () => {
    const reviewId = new mongoose.Types.ObjectId().toHexString();
    const save = jest.fn();
    const review = {
      likes: 1,
      save,
      toObject: jest.fn().mockReturnValue({ likes: 2 }),
    };
    mockReviewModel.findById.mockResolvedValue(review);

    const likeReq = { params: { id: reviewId }, body: { liked: true } } as unknown as Request;
    const res = makeRes();
    await toggleReviewLike(likeReq, res);

    expect(review.likes).toBe(2);
    expect(save).toHaveBeenCalled();

    const unlikeReq = { params: { id: reviewId }, body: { liked: false } } as unknown as Request;
    review.likes = 0;
    await toggleReviewLike(unlikeReq, res);
    expect(review.likes).toBe(0);
  });

  it('prevents deleting another users review', async () => {
    const reviewId = new mongoose.Types.ObjectId().toHexString();
    const req = {
      params: { id: reviewId },
      user: { id: 'owner-2' },
    } as unknown as Request;
    const res = makeRes();

    mockReviewModel.findById = jest.fn().mockResolvedValue({
      userId: { toString: () => 'owner-1' },
    });

    await deleteReview(req as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'You can only delete your own reviews' });
  });

  it('deletes own review successfully', async () => {
    const reviewId = new mongoose.Types.ObjectId().toHexString();
    const deleteSpy = jest.fn();
    mockReviewModel.findById = jest.fn().mockResolvedValue({
      userId: { toString: () => 'owner-1' },
      deleteOne: deleteSpy,
    });

    const req = {
      params: { id: reviewId },
      user: { id: 'owner-1' },
    } as unknown as Request;
    const res = makeRes();

    await deleteReview(req as any, res);

    expect(deleteSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
