import { Router } from 'express';
import { ReportModel } from '../models/report';

const router = Router();

router.post('/api/reports', async (req, res) => {
  try {
    const { type, description, transcript, gameId, reviewId } = req.body as {
      type: 'general' | 'game' | 'review';
      description?: string;
      transcript?: string;
      gameId?: string;
      reviewId?: string;
    };

    if (!type) {
      return res.status(400).json({ success: false, message: 'Report type is required.' });
    }

    const report = await ReportModel.create({
      type,
      description,
      transcript,
      game: gameId || undefined,
      review: reviewId || undefined,
    });

    return res.status(201).json({ success: true, message: 'Report submitted successfully.', id: report.id });
  } catch (err) {
    console.error('Error creating report', err);
    return res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
});

export default router;
