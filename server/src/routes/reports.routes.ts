/**
 * Reports Routes
 * Express routes for handling user-submitted reports.
 * @module reportsRoutes
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import { ReportModel } from '../models/report';

const router = Router();

/** Minimum character length for report descriptions */
const MIN_CHARS = 10;
/** Maximum character length for report descriptions */
const MAX_CHARS = 1000;
/** Regular expression for validating email addresses */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Handler for creating a new report.
 * Validates input and creates a report in the database.
 * 
 * @param {any} req - Express request object
 * @param {any} res - Express response object
 * @returns {Promise<any>} JSON response with success status
 * 
 * @description
 * Validates:
 * - Report type is required
 * - Description length (10-1000 characters)
 * - Review ID required for review reports
 * - Game ID required for game reports
 * - Contact email required for general reports
 */
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

/**
 * POST /api/reports
 * Creates a new user report (general, game, or review).
 * @route POST /api/reports
 * @body {object} Report payload with type, description, etc.
 * @returns {object} JSON with success status and report ID
 */
router.post('/api/reports', createReportHandler);

export default router;
