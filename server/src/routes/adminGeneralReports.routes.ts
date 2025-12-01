import { Router } from 'express';
import mongoose from 'mongoose';
import { protect, authorize } from '../../middleware/auth';
import { ReportModel } from '../models/report';
import User from '../models/user';

const router = Router();

const formatReportId = (id: mongoose.Types.ObjectId) => `GR${id.toString().slice(-6).toUpperCase()}`;

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
      adminId: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
      adminName: adminUser?.name || 'Admin',
      createdAt: new Date(),
    });
    report.status = 'resolved';
    report.resolvedAt = new Date();

    await report.save();
    return res.json({ success: true, report: toDto(report) });
  } catch (err) {
    console.error('Error replying to report', err);
    return res.status(500).json({ success: false, message: 'Failed to reply to report.' });
  }
});

export default router;
