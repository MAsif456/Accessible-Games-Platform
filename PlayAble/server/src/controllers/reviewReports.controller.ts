import { Request, Response } from 'express';
import mongoose from 'mongoose';
import type { ReviewReportOutcome } from '../models/reviewReport';
import ReviewReport from '../models/reviewReport';
import Review from '../models/review';
import { ReportModel } from '../models/report';

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

    const review = await Review.findById(id).lean();
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const report = await ReportModel.create({
      type: 'review',
      description: reasonText.trim(),
      transcript: voiceTranscript,
      review: review._id,
      game: review.gameId ? new mongoose.Types.ObjectId(review.gameId) : undefined,
      reporterId: user?.id ? new mongoose.Types.ObjectId(user.id) : undefined,
      resolved: false,
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating review report', error);
    res.status(500).json({ message: 'Failed to create review report' });
  }
};

export const adminListReviewReports = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt((req.query.pageSize as string) || '10', 10), 1),
      50
    );
    const search = (req.query.search as string | undefined)?.trim().toLowerCase();
    const resolvedParam = (req.query.resolved as string | undefined) ?? 'false';
    const resolved = resolvedParam === 'true';

    const searchRegex = search ? new RegExp(search, 'i') : null;
    const searchObjectId =
      search && mongoose.Types.ObjectId.isValid(search) ? new mongoose.Types.ObjectId(search) : null;

    const reviewReportPipeline: any[] = [
      { $match: { type: 'review' } },
      {
        $addFields: {
          resolvedValue: {
            $cond: [
              { $ne: ['$status', null] },
              { $eq: ['$status', 'resolved'] },
              { $ifNull: ['$resolved', false] },
            ],
          },
          reviewRef: {
            $cond: [
              {
                $and: [
                  { $eq: [{ $type: '$review' }, 'string'] },
                  { $eq: [{ $strLenCP: '$review' }, 24] },
                ],
              },
              { $toObjectId: '$review' },
              '$review',
            ],
          },
        },
      },
      { $match: { resolvedValue: resolved } },
      {
        $lookup: {
          from: 'reviews',
          localField: 'reviewRef',
          foreignField: '_id',
          as: 'reviewDoc',
        },
      },
      { $unwind: { path: '$reviewDoc', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          gameRef: {
            $cond: [
              {
                $and: [
                  { $eq: [{ $type: '$game' }, 'string'] },
                  { $eq: [{ $strLenCP: '$game' }, 24] },
                ],
              },
              { $toObjectId: '$game' },
              { $ifNull: ['$game', '$reviewDoc.gameId'] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'games',
          localField: 'gameRef',
          foreignField: '_id',
          as: 'gameDoc',
        },
      },
      { $unwind: { path: '$gameDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'reporterId',
          foreignField: '_id',
          as: 'reporterUser',
        },
      },
      { $unwind: { path: '$reporterUser', preserveNullAndEmptyArrays: true } },
    ];

    if (searchRegex) {
      reviewReportPipeline.push({
        $match: {
          $or: [
            { description: { $regex: searchRegex } },
            { transcript: { $regex: searchRegex } },
            { 'reviewDoc.body': { $regex: searchRegex } },
            { 'reviewDoc.authorName': { $regex: searchRegex } },
            { 'gameDoc.title': { $regex: searchRegex } },
            ...(searchObjectId ? [{ _id: searchObjectId }] : []),
          ],
        },
      });
    }

    reviewReportPipeline.push({ $sort: { createdAt: -1 } });

    const legacyPipeline: any[] = [
      { $match: { resolved } },
      {
        $lookup: {
          from: 'reviews',
          localField: 'reviewId',
          foreignField: '_id',
          as: 'review',
        },
      },
      { $unwind: { path: '$review', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'games',
          localField: 'review.gameId',
          foreignField: '_id',
          as: 'game',
        },
      },
      { $unwind: { path: '$game', preserveNullAndEmptyArrays: true } },
    ];

    if (searchRegex) {
      legacyPipeline.push({
        $match: {
          $or: [
            { reasonText: { $regex: searchRegex } },
            { 'review.body': { $regex: searchRegex } },
            { 'review.authorName': { $regex: searchRegex } },
            { 'game.title': { $regex: searchRegex } },
            ...(searchObjectId ? [{ _id: searchObjectId }] : []),
          ],
        },
      });
    }

    legacyPipeline.push({ $sort: { createdAt: -1 } });

    const [reportModelDocs, legacyDocs] = await Promise.all([
      ReportModel.aggregate(reviewReportPipeline),
      ReviewReport.aggregate(legacyPipeline),
    ]);

    const mappedReports = [
      ...reportModelDocs.map((doc: any) => {
        const rawReviewId =
          doc.reviewRef?.toString?.() ?? doc.review?.toString?.() ?? doc.reviewDoc?._id?.toString?.();
        const friendlyReviewId =
          doc.reviewDoc?.publicId || (rawReviewId ? `rev_${rawReviewId.slice(0, 8)}` : undefined);

        return {
          _id: doc._id.toString(),
          reviewId: rawReviewId,
          reviewPublicId: friendlyReviewId,
          reportReason: doc.description || doc.transcript || 'No details provided.',
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          resolved: typeof doc.resolved === 'boolean' ? doc.resolved : !!doc.resolvedValue,
          outcome: doc.outcome as ReviewReportOutcome | undefined,
          reporterEmail: doc.reporterUser?.email,
          gameTitle: doc.gameDoc?.title,
          gameSlug: doc.gameDoc?.slug,
          reviewAuthorName: doc.reviewDoc?.authorName,
          reviewBody: doc.reviewDoc?.body,
        };
      }),
      ...legacyDocs.map((doc: any) => {
        const rawReviewId = doc.reviewId?.toString?.() ?? doc.review?._id?.toString?.();
        const friendlyReviewId =
          doc.review?.publicId || (rawReviewId ? `rev_${rawReviewId.slice(0, 8)}` : undefined);

        return {
          _id: doc._id.toString(),
          reviewId: rawReviewId,
          reviewPublicId: friendlyReviewId,
          reportReason: doc.reasonText,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          resolved: !!doc.resolved,
          outcome: doc.outcome as ReviewReportOutcome | undefined,
          reporterEmail: undefined,
          gameTitle: doc.game?.title,
          gameSlug: doc.game?.slug,
          reviewAuthorName: doc.review?.authorName,
          reviewBody: doc.review?.body,
        };
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = mappedReports.length;
    const start = (page - 1) * pageSize;
    const items = mappedReports.slice(start, start + pageSize);

    return res.json({ items, page, pageSize, total });
  } catch (error) {
    console.error('Error listing review reports (admin)', error);
    res.status(500).json({ message: 'Failed to fetch review reports' });
  }
};

export const adminResolveReviewReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, deleteReview: deleteReviewFlag } = req.body as {
      action?: 'complete' | 'delete-review';
      deleteReview?: boolean;
    };
    const user = (req as any).user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }

    const shouldDeleteReview = action === 'delete-review' || deleteReviewFlag === true;

    const report =
      (await ReportModel.findOne({ _id: id, type: 'review' })) || (await ReviewReport.findById(id));
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if ((report as any).resolved) {
      return res.status(400).json({ message: 'Report is already resolved' });
    }

    const reviewId = (report as any).review ?? (report as any).reviewId;

    if (shouldDeleteReview && reviewId) {
      await Review.findByIdAndDelete(reviewId);
    }

    const reportDoc = report as any;
    if (typeof reportDoc.status !== 'undefined') {
      reportDoc.status = 'resolved';
    } else {
      reportDoc.resolved = true;
    }
    reportDoc.resolvedAt = new Date();
    reportDoc.resolvedBy = user?.id ? new mongoose.Types.ObjectId(user.id) : undefined;
    reportDoc.outcome = shouldDeleteReview ? 'deleted' : 'kept';
    await report.save();

    return res.status(200).json(report.toObject());
  } catch (error) {
    console.error('Error resolving review report (admin)', error);
    res.status(500).json({ message: 'Failed to resolve review report' });
  }
};
