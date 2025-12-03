import { Request, Response } from 'express';
import mongoose from 'mongoose';
import type { ReviewReportOutcome } from '../models/reviewReport';
import ReviewReport from '../models/reviewReport';
import Review from '../models/review';
import { ReportModel } from '../models/report';
import { createNotification } from '../services/notificationService';

let legacyReportsMigrated = false;

async function migrateLegacyReviewReports() {
  if (legacyReportsMigrated) return;
  try {
    const legacyDocs = await ReviewReport.find({});
    if (!legacyDocs.length) {
      legacyReportsMigrated = true;
      return;
    }

    const ops = legacyDocs.map(doc => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            type: 'review',
            description: doc.reasonText,
            transcript: doc.voiceTranscript,
            reporterId: doc.reporterId,
            review: doc.reviewId,
            resolved: doc.resolved ?? false,
            resolvedAt: doc.resolvedAt,
            resolvedBy: doc.resolvedBy,
            outcome: doc.outcome,
            adminReply: (doc as any).adminReply,
          },
        },
        upsert: true,
      },
    }));

    await ReportModel.bulkWrite(ops);
    await ReviewReport.deleteMany({ _id: { $in: legacyDocs.map(d => d._id) } });
    legacyReportsMigrated = true;
  } catch (error) {
    console.error('Error migrating legacy review reports', error);
  }
}


/**
 * Creates a new review report.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the request has been handled.
 * @throws {Error} - An error occurred while creating the review report.
 */

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


/**
 * Admin: list review reports (supports resolved/unresolved and search).
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>} - Promise resolving to void.
 * @throws {Error} - If there is an error fetching the review reports.
 */
export const adminListReviewReports = async (req: Request, res: Response) => {
  try {
    await migrateLegacyReviewReports();

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
      search && mongoose.Types.ObjectId.isValid(search)
        ? new mongoose.Types.ObjectId(search)
        : null;

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
        $lookup: {
          from: 'users',
          localField: 'reviewDoc.userId',
          foreignField: '_id',
          as: 'reviewAuthor',
        },
      },
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
          reviewAuthorName: {
            $ifNull: [
              { $arrayElemAt: ['$reviewAuthor.name', 0] },
              {
                $ifNull: [
                  { $arrayElemAt: ['$reviewAuthor.email', 0] },
                  { $ifNull: ['$reviewDoc.authorName', 'Anonymous'] },
                ],
              },
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

    const reportModelDocs = await ReportModel.aggregate(reviewReportPipeline);

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
          from: 'users',
          localField: 'review.userId',
          foreignField: '_id',
          as: 'reviewAuthor',
        },
      },
      {
        $lookup: {
          from: 'games',
          localField: 'review.gameId',
          foreignField: '_id',
          as: 'game',
        },
      },
      { $unwind: { path: '$game', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          reviewAuthorName: {
            $ifNull: [
              { $arrayElemAt: ['$reviewAuthor.name', 0] },
              {
                $ifNull: [
                  { $arrayElemAt: ['$reviewAuthor.email', 0] },
                  { $ifNull: ['$review.authorName', 'Anonymous'] },
                ],
              },
            ],
          },
        },
      },
    ];

    const legacyDocs = await ReviewReport.aggregate(legacyPipeline);

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
          adminReply: doc.adminReply || doc.reviewDoc?.adminReply,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          resolved: typeof doc.resolved === 'boolean' ? doc.resolved : !!doc.resolvedValue,
          outcome: doc.outcome as ReviewReportOutcome | undefined,
          reporterEmail: doc.reporterUser?.email,
          gameTitle: doc.gameDoc?.title,
          gameSlug: doc.gameDoc?.slug,
          reviewAuthorName: doc.reviewAuthorName || doc.reviewDoc?.authorName || 'Anonymous',
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
          reviewAuthorName: doc.reviewAuthorName || doc.review?.authorName || 'Anonymous',
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

/**
 * Admin: resolve a review report, optionally deleting the review.
 */
export const adminResolveReviewReport = async (req: Request, res: Response) => {
  try {
    await migrateLegacyReviewReports();

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

    let report = await ReportModel.findOne({ _id: id, type: 'review' });

    // If we can't find a new-style report, try to migrate a legacy ReviewReport on the fly.
    if (!report) {
      const legacy = await ReviewReport.findById(id);
      if (legacy) {
        const reviewObjectId =
          legacy.reviewId && mongoose.Types.ObjectId.isValid(legacy.reviewId)
            ? new mongoose.Types.ObjectId(legacy.reviewId)
            : undefined;

        report = await ReportModel.create({
          type: 'review',
          description: legacy.reasonText,
          transcript: legacy.voiceTranscript,
          reporterId: legacy.reporterId,
          review: reviewObjectId,
          resolved: legacy.resolved ?? false,
          resolvedAt: legacy.resolvedAt,
          resolvedBy: legacy.resolvedBy,
          outcome: legacy.outcome,
          adminReply: (legacy as any).adminReply,
        });

        // Clean up the legacy document so we don't keep diverging schemas around.
        await legacy.deleteOne();
      }
    }

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if ((report as any).resolved) {
      // Idempotent resolve: return current report state instead of erroring
      return res.status(200).json(report.toObject());
    }

    const reviewId = (report as any).review ?? (report as any).reviewId;
    const reviewDoc = reviewId ? await Review.findById(reviewId) : null;
    const adminReplySnapshot = (reviewDoc as any)?.adminReply;

    let reviewData: any = null;
    if (shouldDeleteReview && reviewId) {
      const found = await Review.findById(reviewId);
      if (found && typeof (found as any).populate === 'function') {
        reviewData = await (found as any).populate('gameId', 'title slug').lean?.();
      } else {
        reviewData = found;
      }
      await Review.findByIdAndDelete(reviewId);
    }

    const reportDoc = report as any;

    // Support both new ReportModel (status field) and legacy ReviewReport (resolved boolean)
    if (typeof reportDoc.status !== 'undefined') {
      reportDoc.status = 'resolved';
    } else {
      reportDoc.resolved = true;
    }

    reportDoc.resolvedAt = new Date();
    reportDoc.resolvedBy = user?.id ? new mongoose.Types.ObjectId(user.id) : undefined;
    reportDoc.outcome = shouldDeleteReview ? 'deleted' : 'kept';

    // For legacy ReviewReport docs, preserve any admin reply that may have been
    // saved on the underlying Review document if the report itself has none.
    if (adminReplySnapshot && typeof reportDoc.adminReply === 'undefined') {
      reportDoc.adminReply = adminReplySnapshot;
    }

    await report.save();

    // Create notification for the review author if review was deleted
    if (shouldDeleteReview && reviewData && reviewData.userId) {
      try {
        const reviewContent = reviewData.body?.substring(0, 100) || 'your review';
        const gameTitle = (reviewData.gameId as any)?.title || 'the game';
        const gameSlug = (reviewData.gameId as any)?.slug;
        const gameId = reviewData.gameId?.toString();
        const deletionReason = reportDoc.description || 'Reported content violation';

        await createNotification(
          reviewData.userId,
          'review_deleted',
          'Your Review Has Been Deleted',
          `Your review for "${gameTitle}" has been deleted by an administrator. Reason: ${deletionReason}`,
          {
            reviewId: reviewId.toString(),
            gameId: gameId ? new mongoose.Types.ObjectId(gameId) : undefined,
            metadata: {
              reviewContent,
              deletionReason,
              gameTitle,
              gameSlug,
            },
          }
        );
      } catch (notifError) {
        // Don't fail the resolution if notification creation fails
        console.error('Error creating notification for review deletion', notifError);
      }
    }

    return res.status(200).json(report.toObject());
  } catch (error) {
    console.error('Error resolving review report (admin)', error);
    res.status(500).json({ message: 'Failed to resolve review report' });
  }
};
