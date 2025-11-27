import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Review from '../models/review';

export const listReviews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid game ID' });
    }

    const reviews = await Review.find({ gameId: id }).sort({ createdAt: -1 }).lean();
    res.json(reviews);
  } catch (error) {
    console.error('Error listing reviews', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};

export const createReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { body } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid game ID' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!body || !body.trim()) {
      return res.status(400).json({ message: 'Review text is required' });
    }

    const review = await Review.create({
      gameId: new mongoose.Types.ObjectId(id),
      userId: user.id,
      authorName: user.name || user.email || 'Anonymous',
      body: body.trim(),
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review', error);
    res.status(500).json({ message: 'Failed to create review' });
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

    res.json(review);
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