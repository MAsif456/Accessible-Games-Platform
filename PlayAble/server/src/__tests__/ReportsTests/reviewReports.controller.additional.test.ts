import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  createReviewReport,
  adminListReviewReports,
  adminResolveReviewReport,
} from '../../controllers/reviewReports.controller';
import Review from '../../models/review';
import { ReportModel } from '../../models/report';
import ReviewReport from '../../models/reviewReport';

jest.mock('../../services/notificationService', () => ({
  createNotification: jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId() }),
}));

jest.mock('../../models/notification', () => ({
  NotificationModel: {
    findById: jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId() }),
  },
}));

jest.mock('../../models/review', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock('../../models/report', () => ({
  __esModule: true,
  ReportModel: {
    create: jest.fn(),
    aggregate: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../../models/reviewReport', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  },
}));

const mockReviewModel = Review as unknown as {
  findById: jest.Mock;
  findByIdAndDelete: jest.Mock;
};

const mockReportModel = ReportModel as unknown as {
  create: jest.Mock;
  aggregate: jest.Mock;
  findOne: jest.Mock;
};

const mockLegacyReviewReport = ReviewReport as unknown as {
  find: jest.Mock;
  aggregate: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
};

/**
 * Creates a mock response object for Express route handlers.
 * The mock response object has `status`, `json`, and `send` methods, which
 * all return the mock response object itself, allowing for chaining.
 * @returns {Object} A mock response object for Express route handlers.
 */
const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response & {
    status: jest.Mock;
    json: jest.Mock;
    send: jest.Mock;
  };
};

describe('reviewReports.controller additional coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReviewReport', () => {
    it('rejects invalid ids, missing users, and short reasons', async () => {
      const invalidReq = { params: { id: 'bad' }, body: {}, user: {} } as unknown as Request;
      const invalidRes = makeRes();
      await createReviewReport(invalidReq, invalidRes);
      expect(invalidRes.status).toHaveBeenCalledWith(400);

      const noUserReq = {
        params: { id: new mongoose.Types.ObjectId().toHexString() },
        body: { reasonText: 'A valid reason' },
      } as unknown as Request;
      const noUserRes = makeRes();
      await createReviewReport(noUserReq, noUserRes);
      expect(noUserRes.status).toHaveBeenCalledWith(401);

      const shortReasonReq = {
        params: { id: new mongoose.Types.ObjectId().toHexString() },
        body: { reasonText: 'short' },
        user: { id: 'user-1' },
      } as unknown as Request;
      const shortRes = makeRes();
      await createReviewReport(shortReasonReq, shortRes);
      expect(shortRes.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when review is missing', async () => {
      const reviewId = new mongoose.Types.ObjectId().toHexString();
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockReviewModel.findById.mockReturnValue(mockQuery);

      const req = {
        params: { id: reviewId },
        body: { reasonText: 'This review is spammy enough' },
        user: { id: 'user-1' },
      } as unknown as Request;
      const res = makeRes();

      await createReviewReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('creates a review report successfully', async () => {
      const reviewId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const gameId = new mongoose.Types.ObjectId();
      const reviewDoc = { _id: reviewId, gameId: { _id: gameId, title: 'Test Game', slug: 'test-game' } };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ ...reviewDoc, userId: userId, body: 'Test review body' }),
      };
      mockReviewModel.findById.mockReturnValue(mockQuery);
      mockLegacyReviewReport.create.mockResolvedValue({ _id: 'report-1' });

      const req = {
        params: { id: reviewId.toHexString() },
        body: { reasonText: 'This review is clearly abusive.', voiceTranscript: 'transcript' },
        user: { id: userId.toHexString() },
      } as unknown as Request;
      const res = makeRes();

      await createReviewReport(req, res);

      expect(mockQuery.populate).toHaveBeenCalledWith('gameId', 'title slug');
      expect(mockLegacyReviewReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reviewId: reviewId,
          reporterId: userId,
          reasonText: 'This review is clearly abusive.',
          voiceTranscript: 'transcript',
          resolved: false,
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('adminListReviewReports with search/resolved', () => {
    it('merges modern and legacy reports with search applied', async () => {
      const now = new Date();
      const earlier = new Date(Date.now() - 1000);
      mockReportModel.aggregate.mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          reviewRef: new mongoose.Types.ObjectId(),
          description: '',
          transcript: '',
          createdAt: now,
          updatedAt: now,
          resolved: true,
          reporterUser: { email: 'modern@test.com' },
          gameDoc: { title: 'Modern Game', slug: 'modern' },
          reviewDoc: { authorName: 'Modern Author', body: 'Body', publicId: 'rev_mod' },
        },
      ]);
      mockLegacyReviewReport.aggregate.mockResolvedValue([
        {
          _id: new mongoose.Types.ObjectId(),
          reviewId: new mongoose.Types.ObjectId(),
          reasonText: 'Legacy reason',
          createdAt: earlier,
          updatedAt: earlier,
          resolved: true,
          outcome: 'kept',
          review: { authorName: 'Legacy Author', body: 'Old body', publicId: 'rev_old' },
          game: { title: 'Legacy Game', slug: 'legacy' },
        },
      ]);

      const req = {
        query: { page: '1', pageSize: '5', search: 'spam', resolved: 'true' },
      } as unknown as Request;
      const res = makeRes();

      await adminListReviewReports(req, res);

      expect(mockReportModel.aggregate).toHaveBeenCalled();
      expect(mockLegacyReviewReport.aggregate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 2,
          items: expect.arrayContaining([
            expect.objectContaining({ reportReason: 'No details provided.' }),
            expect.objectContaining({ reportReason: 'Legacy reason', resolved: true }),
          ]),
        })
      );
    });
  });

  describe('adminResolveReviewReport edge cases', () => {
    it('validates id and existence before resolving', async () => {
      const badReq = { params: { id: 'bad' }, body: {} } as unknown as Request;
      const badRes = makeRes();
      await adminResolveReviewReport(badReq, badRes);
      expect(badRes.status).toHaveBeenCalledWith(400);

      const missingId = new mongoose.Types.ObjectId().toHexString();
      mockReportModel.findOne.mockResolvedValue(null);
      mockLegacyReviewReport.findById.mockResolvedValue(null);
      const missingReq = { params: { id: missingId }, body: {} } as unknown as Request;
      const missingRes = makeRes();
      await adminResolveReviewReport(missingReq, missingRes);
      expect(missingRes.status).toHaveBeenCalledWith(404);
    });

    it('blocks already resolved reports', async () => {
      const resolvedId = new mongoose.Types.ObjectId().toHexString();
      const req = { params: { id: resolvedId }, body: {} } as unknown as Request;
      const res = makeRes();

      mockReportModel.findOne.mockResolvedValue({
        resolved: true,
        toObject: jest.fn().mockReturnValue({ _id: resolvedId, resolved: true }),
      });
      mockLegacyReviewReport.findById.mockResolvedValue(null);

      await adminResolveReviewReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ resolved: true }));
    });

    it('resolves a legacy review report without deleting the review', async () => {
      const reportId = new mongoose.Types.ObjectId().toHexString();
      const reviewId = new mongoose.Types.ObjectId().toHexString();
      const save = jest.fn().mockResolvedValue(undefined);

      mockReportModel.findOne.mockResolvedValue(null);
      mockLegacyReviewReport.findById.mockResolvedValue({
        reviewId,
        resolved: false,
        save,
        toObject: jest.fn().mockReturnValue({ _id: reportId, outcome: 'kept' }),
        deleteOne: jest.fn(),
      });
      const createdReport = {
        save: jest.fn().mockResolvedValue(undefined),
        toObject: jest.fn().mockReturnValue({ _id: reportId, resolved: true, outcome: 'kept' }),
      };
      mockReportModel.create.mockResolvedValue(createdReport as any);
      mockReviewModel.findByIdAndDelete.mockResolvedValue(null);

      const req = {
        params: { id: reportId },
        body: { action: 'complete' },
        user: { id: new mongoose.Types.ObjectId().toHexString() },
      } as unknown as Request;
      const res = makeRes();

      await adminResolveReviewReport(req, res);

      expect(mockReviewModel.findByIdAndDelete).not.toHaveBeenCalled();
      expect(createdReport.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
