/**
 * Admin Game Reports Routes
 * Provides CRUD-style endpoints for moderators to review and resolve game reports.
 * Mirrors the general reports endpoints but enriches the payload with game details.
 * @module adminGameReportsRoutes
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import { protect, authorize } from '../../middleware/auth';
import { ReportModel } from '../models/report';
import User from '../models/user';

const router = Router();

/**
 * Formats a raw Mongo ObjectId into a human-readable report code.
 * Uses the prefix RG (Reported Game) to differentiate from general reports.
 *
 * @param {mongoose.Types.ObjectId} id - Report identifier
 * @returns {string} Readable code (e.g. RG-1A2B3C)
 */
const formatGameReportCode = (id: mongoose.Types.ObjectId): string =>
  `RG-${id.toString().slice(-6).toUpperCase()}`;

/**
 * Maps a report document into a DTO consumed by the frontend.
 *
 * @param {any} report - Populated report document
 * @returns {object} Sanitised DTO ready for JSON responses
 */
const toDto = (report: any) => ({
  id: report._id.toString(),
  reportCode: formatGameReportCode(report._id),
  gameId:
    report.game?._id?.toString?.() ??
    (typeof report.game === 'string' ? report.game : null),
  gameTitle: report.game?.title || 'Unknown game',
  issueType: report.issueType || 'Accessibility Issue',
  description: report.description || '',
  status: report.status || 'open',
  reporterEmail: report.reporterEmail || null,
  reporterName: report.reporterName || null,
  reporterId: report.reporterId ? report.reporterId.toString() : null,
  createdAt: report.createdAt,
  resolvedAt: report.resolvedAt || null,
  resolvedByName: report.resolvedBy?.name || null,
  resolvedById: report.resolvedBy?._id?.toString() || null,
  adminReplies: (report.adminReplies || []).map((reply: any) => ({
    message: reply.message,
    adminName: reply.adminName || 'Admin',
    createdAt: reply.createdAt,
  })),
});

/**
 * GET /api/admin/game-reports
 * Returns a list of game reports filtered by status.
 */
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const status = req.query.status === 'resolved' ? 'resolved' : 'open';
    const query: Record<string, any> = { type: 'game' };

    if (status === 'resolved') {
      query.status = 'resolved';
    } else {
      query.status = { $ne: 'resolved' };
    }

    const reports = await ReportModel.find(query)
      .populate('game', 'title slug')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ reports: reports.map(toDto) });
  } catch (error) {
    console.error('Error fetching game reports', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to load game reports.' });
  }
});

/**
 * POST /api/admin/game-reports/:id/reply
 * Records an admin reply and marks the report as resolved.
 */
router.post('/:id/reply', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body as { message?: string };
    const trimmed = message?.trim();

    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Reply message is required.' });
    }

    const report = await ReportModel.findOne({ _id: id, type: 'game' });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const adminUser = req.user?.id ? await User.findById(req.user.id).select('name') : null;

    report.adminReplies.push({
      message: trimmed,
      adminId: req.user?.id as any,
      adminName: adminUser?.name || 'Admin',
      createdAt: new Date(),
    });
    report.status = 'resolved';
    report.resolvedAt = new Date();
    if (req.user?.id) {
      report.resolvedBy = req.user.id as any;
    }

    await report.save();
    const populated = await ReportModel.findById(report._id)
      .populate('game', 'title slug')
      .populate('resolvedBy', 'name')
      .lean();

    return res.json({ success: true, report: populated ? toDto(populated) : toDto(report) });
  } catch (error) {
    console.error('Error replying to game report', error);
    return res.status(500).json({ success: false, message: 'Failed to reply to report.' });
  }
});

export default router;
