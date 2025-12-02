/**
 * Reports Routes
 * Express routes for handling user-submitted reports.
 * @module reportsRoutes
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import { ReportModel } from '../models/report';
import { createNotification } from '../services/notificationService';
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
      issueType: issueType?.trim() || undefined,
      game: gameId || undefined,
      review: reviewId || undefined,
      reporterId: parsedReporterId,
      reporterEmail: trimmedReporterEmail || undefined,
      reporterName: reporterName?.trim() || authReporterName || undefined,
      status: 'open',
    });

    // Create notification for report submission confirmation
    if (parsedReporterId) {
      try {
        const reportCode = `RPT-${report._id.toString().slice(-6).toUpperCase()}`;
        const reportTypeLabel = type === 'general' ? 'General Issue' : type === 'game' ? 'Game' : 'Review';
        
        await createNotification(
          parsedReporterId,
          'report_submitted',
          'Report Submitted Successfully',
          `Your ${reportTypeLabel.toLowerCase()} report has been submitted and is being reviewed. Report ID: ${reportCode}`,
          {
            reportId: report._id,
            gameId: gameId ? new mongoose.Types.ObjectId(gameId) : undefined,
            reviewId: reviewId ? new mongoose.Types.ObjectId(reviewId) : undefined,
            metadata: {
              reportCode,
              reportType: type,
            },
          }
        );
      } catch (notifError) {
        // Don't fail the report submission if notification creation fails
        console.error('Error creating notification for report submission', notifError);
      }
    }

    return res.status(201).json({ success: true, message: 'Report submitted successfully.', id: report.id });
  } catch (err) {
    console.error('Error creating report', err);
    return res.status(500).json({ success: false, message: 'Failed to submit report.' });
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
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID.' });
    }

    const report = await ReportModel.findById(id).lean();
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    // Check if user owns this report (by ID or email)
    const reportReporterId = report.reporterId?.toString();
    const reportReporterEmail = report.reporterEmail;
    const userEmail = req.user?.email;

    const ownsReport = 
      reportReporterId === userId ||
      (reportReporterEmail && userEmail && reportReporterEmail.toLowerCase() === userEmail.toLowerCase());

    if (!ownsReport) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this report.' });
    }

    // Format report code based on type
    const formatReportCode = (reportId: string, type: string) => {
      if (type === 'general') {
        return `GR${reportId.slice(-6).toUpperCase()}`;
      } else if (type === 'game') {
        return `RG-${reportId.slice(-6).toUpperCase()}`;
      } else {
        return `RPT-${reportId.slice(-6).toUpperCase()}`;
      }
    };

    const reportCode = formatReportCode(report._id.toString(), report.type);

    return res.json({
      success: true,
      report: {
        id: report._id.toString(),
        reportCode,
        type: report.type,
        description: report.description || '',
        transcript: report.transcript || '',
        issueType: report.issueType || '',
        status: report.status || 'open',
        createdAt: report.createdAt,
        resolvedAt: report.resolvedAt || null,
        adminReplies: (report.adminReplies || []).map((reply: any) => ({
          message: reply.message,
          adminName: reply.adminName || 'Admin',
          createdAt: reply.createdAt,
        })),
        gameId: report.game?.toString() || null,
        reviewId: report.review?.toString() || null,
      },
    });
  } catch (err) {
    console.error('Error fetching report', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch report.' });
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

/**
 * GET /api/reports/:id
 * Fetches a user's own report by ID.
 * @route GET /api/reports/:id
 * @param {string} id - The report ID
 * @returns {object} JSON with report data including admin replies
 * @security Requires authentication, user can only fetch their own reports
 */
router.get('/api/reports/:id', protect, getReportHandler);

export default router;
