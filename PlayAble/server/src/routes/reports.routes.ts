import { Router } from 'express';
import { ReportModel } from '../models/report';

const router = Router();
const MIN_CHARS = 10;
const MAX_CHARS = 1000;


/**
 * Handles report submission from the client.
 * @param {Request} req - The request object containing the report details.
 * @param {Response} res - The response object.
 * @throws {Error} - An error occurred while creating the report.
 * @returns {Promise<void>} - A promise that resolves when the request has been handled.
 */
export async function createReportHandler(req: any, res: any) {
  try {
    const { type, description, transcript, gameId, reviewId } = req.body as {
      type: 'general' | 'game' | 'review';
      description?: string;
      transcript?: string;
      gameId?: string;
      reviewId?: string;
    };
    const reporterId = (req as any)?.user?.id;

    if (!type) {
      return res.status(400).json({ success: false, message: 'Report type is required.' });
    }

    const trimmedDescription = description?.trim();
    if (trimmedDescription) {
      if (trimmedDescription.length < MIN_CHARS) {
        return res
          .status(400)
          .json({ success: false, message: `Description must be at least ${MIN_CHARS} characters.` });
      }
      if (trimmedDescription.length > MAX_CHARS) {
        return res
          .status(400)
          .json({ success: false, message: `Description must be under ${MAX_CHARS} characters.` });
      }
    }

    if (type === 'review' && !reviewId) {
      return res
        .status(400)
        .json({ success: false, message: 'Review ID is required to report a review.' });
    }

    if (type === 'game' && !gameId) {
      return res
        .status(400)
        .json({ success: false, message: 'Game ID is required to report a game.' });
    }

    const report = await ReportModel.create({
      type,
      description: trimmedDescription || undefined,
      transcript,
      game: gameId || undefined,
      review: reviewId || undefined,
      reporterId: reporterId || undefined,
    });

    return res
      .status(201)
      .json({ success: true, message: 'Report submitted successfully.', id: report.id });
  } catch (err) {
    console.error('Error creating report', err);
    return res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
}

router.post('/api/reports', createReportHandler);

export default router;
