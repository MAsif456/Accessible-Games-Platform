import { Router } from 'express';
import mongoose from 'mongoose';
import { ReportModel } from '../models/report';

const router = Router();
const MIN_CHARS = 10;
const MAX_CHARS = 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createReportHandler(req: any, res: any) {
  try {
    const { type, description, transcript, gameId, reviewId, reporterEmail, reporterName, reporterId } = req.body as {
      type: 'general' | 'game' | 'review';
      description?: string;
      transcript?: string;
      gameId?: string;
      reviewId?: string;
      reporterEmail?: string;
      reporterName?: string;
      reporterId?: string;
    };
    const authReporterId = (req as any)?.user?.id;
    const authReporterEmail = (req as any)?.user?.email;
    const authReporterName = (req as any)?.user?.name;

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

    const trimmedReporterEmail = reporterEmail?.trim() || authReporterEmail?.trim();
    if (type === 'general' && !trimmedReporterEmail) {
      return res
        .status(400)
        .json({ success: false, message: 'Contact email is required for general reports.' });
    }
    if (trimmedReporterEmail && !EMAIL_REGEX.test(trimmedReporterEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const requestReporterId = reporterId || authReporterId;
    const parsedReporterId =
      requestReporterId && mongoose.Types.ObjectId.isValid(requestReporterId)
        ? new mongoose.Types.ObjectId(requestReporterId)
        : undefined;

    const report = await ReportModel.create({
      type,
      description: trimmedDescription || undefined,
      transcript,
      game: gameId || undefined,
      review: reviewId || undefined,
      reporterId: parsedReporterId,
      reporterEmail: trimmedReporterEmail || undefined,
      reporterName: reporterName?.trim() || authReporterName || undefined,
      status: 'open',
    });

    return res.status(201).json({ success: true, message: 'Report submitted successfully.', id: report.id });
  } catch (err) {
    console.error('Error creating report', err);
    return res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
}

router.post('/api/reports', createReportHandler);

export default router;
