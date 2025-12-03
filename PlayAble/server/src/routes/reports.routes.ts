import { Router } from 'express';
import mongoose from 'mongoose';
import { ReportModel } from '../models/report';
import { protect } from '../middleware/auth';

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
 */
export async function createReportHandler(req: any, res: any) {
  try {
    const {
      type,
      description,
      transcript,
      gameId,
      reviewId,
      reporterEmail,
      reporterName,
      reporterId,
      issueType,
    } = req.body as {
      type: 'general' | 'game' | 'review';
      description?: string;
      transcript?: string;
      gameId?: string;
      reviewId?: string;
      reporterEmail?: string;
      reporterName?: string;
      reporterId?: string;
      issueType?: string;
    };

    const authReporterId = (req as any)?.user?.id;
    const authReporterEmail = (req as any)?.user?.email;
    const authReporterName = (req as any)?.user?.name;

    // Basic type validation
    if (!type) {
      return res
        .status(400)
        .json({ success: false, message: 'Report type is required.' });
    }

    let trimmedDescription = description?.trim();
    if (trimmedDescription) {
      if (trimmedDescription.length < MIN_CHARS) {
        return res.status(400).json({
          success: false,
          message: `Description must be at least ${MIN_CHARS} characters.`,
        });
      }
      if (trimmedDescription.length > MAX_CHARS) {
        return res.status(400).json({
          success: false,
          message: `Description must be under ${MAX_CHARS} characters.`,
        });
      }
    }

    if (type === 'review' && !reviewId) {
      return res.status(400).json({
        success: false,
        message: 'Review ID is required for review reports.',
      });
    }

    if (type === 'game' && !gameId) {
      return res.status(400).json({
        success: false,
        message: 'Game ID is required for game reports.',
      });
    }

    const trimmedReporterEmail = reporterEmail?.trim() || authReporterEmail?.trim();
    if (type === 'general' && !trimmedReporterEmail) {
      return res.status(400).json({
        success: false,
        message: 'A valid contact email is required for general reports.',
      });
    }
    if (trimmedReporterEmail && !EMAIL_REGEX.test(trimmedReporterEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const requestReporterId = reporterId || authReporterId;
    const parsedReporterId =
      requestReporterId && mongoose.Types.ObjectId.isValid(requestReporterId)
        ? new mongoose.Types.ObjectId(requestReporterId)
        : undefined;

    const gameObjectId =
      gameId && mongoose.Types.ObjectId.isValid(gameId)
        ? new mongoose.Types.ObjectId(gameId)
        : undefined;

    const reviewObjectId =
      reviewId && mongoose.Types.ObjectId.isValid(reviewId)
        ? new mongoose.Types.ObjectId(reviewId)
        : undefined;

    const report = await ReportModel.create({
      type,
      description: trimmedDescription,
      transcript,
      issueType: type === 'game' ? issueType : undefined,
      game: type === 'game' || type === 'review' ? gameObjectId : undefined,
      review: type === 'review' ? reviewObjectId : undefined,
      reporterId: parsedReporterId,
      reporterEmail: trimmedReporterEmail,
      reporterName: (reporterName || authReporterName || '').trim() || undefined,
      status: 'open',
    });

    return res
      .status(201)
      .json({
        success: true,
        message: 'Report submitted successfully.',
        id: (report as any).id || (report as any)._id?.toString?.(),
      });
  } catch (err) {
    console.error('Error creating report', err);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to submit report. Please try again.' });
  }
}

/**
 * Handler for fetching a user's own report by ID.
 * Users can only fetch reports they submitted.
 * 
 * @param {any} req - Express request object
 * @param {any} res - Express response object
 * @returns {Promise<any>} JSON response with report data
 */
export async function getReportHandler(req: any, res: any) {
  try {
    const { id } = req.params as { id: string };
    const userId = (req as any)?.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID.' });
    }

    const report = await ReportModel.findById(id)
      .populate('game', 'title slug')
      .populate('review', 'body')
      .lean();

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    if (report.reporterId && userId && report.reporterId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this report.' });
    }

    return res.json({ success: true, report });
  } catch (err) {
    console.error('Error fetching report', err);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to fetch report. Please try again.' });
  }
}

// Routes
router.post('/api/reports', protect, createReportHandler);
router.get('/api/reports/:id', protect, getReportHandler);

export default router;
