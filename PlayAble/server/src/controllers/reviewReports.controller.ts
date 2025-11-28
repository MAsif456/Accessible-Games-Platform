import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ReviewReport from '../models/reviewReport';

export const createReviewReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { reasonText, voiceTranscript } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!reasonText || reasonText.trim().length < 10) {
      return res.status(400).json({ message: 'Reason must be at least 10 characters.' });
    }

    const report = await ReviewReport.create({
      reviewId: new mongoose.Types.ObjectId(id),
      reporterId: user.id,
      reasonText: reasonText.trim(),
      voiceTranscript,
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating review report', error);
    res.status(500).json({ message: 'Failed to create review report' });
  }
};