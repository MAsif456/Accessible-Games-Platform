/**
 * Admin General Reports Routes
 * Express routes for managing general reports submitted by users.
 * All routes require admin authentication.
 * @module adminGeneralReportsRoutes
 */
import { Router } from 'express';
import mongoose from 'mongoose';
import { protect, authorize } from '../../middleware/auth';
import { ReportModel } from '../models/report';
import User from '../models/user';

const router = Router();

/**
 * Formats a MongoDB ObjectId into a human-readable report code.
 * @param {mongoose.Types.ObjectId} id - The report's ObjectId
 * @returns {string} Formatted code (e.g., 'GR123ABC')
 */
const formatReportId = (id: mongoose.Types.ObjectId) => `GR${id.toString().slice(-6).toUpperCase()}`;

/**
 * Transforms a report document into a Data Transfer Object for the API response.
 * @param {any} report - The raw report document from MongoDB
 * @returns {object} Formatted report DTO with sanitised fields
 */
const toDto = (report: any) => ({
  id: report._id.toString(),
  reportCode: formatReportId(report._id),
  description: report.description || '',
  status: report.status,
  reporterEmail: report.reporterEmail || null,
  reporterName: report.reporterName || null,
  reporterId: report.reporterId ? report.reporterId.toString() : null,
  createdAt: report.createdAt,
  resolvedAt: report.resolvedAt || null,
  adminReplies: (report.adminReplies || []).map((reply: any) => ({
    message: reply.message,
    adminName: reply.adminName || 'Admin',
    createdAt: reply.createdAt,
  })),
});

/**
 * GET /
 * Retrieves all general reports filtered by status.
 * @route GET /api/admin/general-reports
 * @query {string} [status='open'] - Filter by 'open' or 'resolved'
 * @returns {object} JSON object containing array of reports
 * @security Requires admin authentication
 */
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const status = req.query.status === 'resolved' ? 'resolved' : 'open';
    const query: any = { type: 'general' };
    if (status === 'resolved') {
      query.status = 'resolved';
    } else {
      query.$or = [{ status: 'open' }, { status: { $exists: false } }];
    }
    const reports = await ReportModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ reports: reports.map(toDto) });
  } catch (err) {
    console.error('Error fetching general reports', err);
    return res.status(500).json({ success: false, message: 'Failed to load reports.' });
  }
});

/**
 * POST /:id/reply
 * Adds an admin reply to a general report and marks it as resolved.
 * @route POST /api/admin/general-reports/:id/reply
 * @param {string} id - The report ID to reply to
 * @body {string} message - The reply message content
 * @returns {object} JSON object with success status and updated report
 * @security Requires admin authentication
 */
router.post('/:id/reply', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body as { message?: string };
    const trimmed = message?.trim();
    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Reply message is required.' });
    }

    const report = await ReportModel.findOne({ _id: id, type: 'general' });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    const adminUser = req.user?.id ? await User.findById(req.user.id).select('name') : null;
    report.adminReplies.push({
      message: trimmed,
      adminId: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) as any : undefined,
      adminName: adminUser?.name || 'Admin',
      createdAt: new Date(),
    });
    report.status = 'resolved';
    report.resolvedAt = new Date();
    if (req.user?.id) {
      report.set('resolvedBy', new mongoose.Types.ObjectId(req.user.id));
    }

    await report.save();
    return res.json({ success: true, report: toDto(report) });
  } catch (err) {
    console.error('Error replying to report', err);
    return res.status(500).json({ success: false, message: 'Failed to reply to report.' });
  }
});

export default router;
