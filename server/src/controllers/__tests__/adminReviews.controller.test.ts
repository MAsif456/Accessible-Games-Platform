import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  adminDeleteReview,
  adminListReviews,
  adminReplyToReview,
} from '../reviews.controller';
import {
  adminListReviewReports,
  adminResolveReviewReport,
} from '../reviewReports.controller';
import Review from '../../models/review';
import { ReportModel } from '../../models/report';
import ReviewReport from '../../models/reviewReport';

jest.mock('../../models/review', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock('../../models/report', () => ({
  __esModule: true,
  ReportModel: {
    aggregate: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../../models/reviewReport', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
    findById: jest.fn(),
  },
}));

const mockReviewModel = Review as unknown as {
  aggregate: jest.Mock;
  findById: jest.Mock;
  findByIdAndDelete: jest.Mock;
};

const mockReportModel = ReportModel as unknown as {
  aggregate: jest.Mock;
  findOne: jest.Mock;
};

const mockLegacyReviewReport = ReviewReport as unknown as {
  aggregate: jest.Mock;
  findById: jest.Mock;
};

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

describe('Admin reviews controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('paginates and returns admin reviews', async () => {
    const req = {
      query: { page: '2', pageSize: '1', search: 'zelda' },
    } as unknown as Request;
    const res = makeRes();

    mockReviewModel.aggregate
      .mockResolvedValueOnce([
        { _id: 'a1', publicId: 'rev_a1', gameTitle: 'Zelda', body: 'Great!', authorName: 'Link' },
      ])
      .mockResolvedValueOnce([{ total: 3 }]);

    await adminListReviews(req, res);

    expect(mockReviewModel.aggregate).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({
      items: expect.any(Array),
      page: 2,
      pageSize: 1,
      total: 3,
    });
  });

  it('deletes a review by id (admin)', async () => {
    const req = { params: { id: new mongoose.Types.ObjectId().toHexString() } } as unknown as Request;
    const res = makeRes();

    const deleteSpy = jest.fn();
    mockReviewModel.findById = jest.fn().mockResolvedValue({ deleteOne: deleteSpy });

    await adminDeleteReview(req, res);

    expect(deleteSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('validates and saves admin reply to review', async () => {
    const reviewId = new mongoose.Types.ObjectId().toHexString();
    const req = {
      params: { id: reviewId },
      body: { reply: 'Thanks for the feedback!' },
    } as unknown as Request;
    const res = makeRes();

    const saveSpy = jest.fn();
    mockReviewModel.findById = jest.fn().mockResolvedValue({
      save: saveSpy,
      toObject: jest.fn().mockReturnValue({ _id: reviewId, adminReply: 'Thanks for the feedback!' }),
    });

    await adminReplyToReview(req, res);

    expect(mockReviewModel.findById).toHaveBeenCalledWith(reviewId);
    expect(saveSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('Admin review reports controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists unresolved review reports with merged sources', async () => {
    const req = {
      query: { page: '1', pageSize: '10', resolved: 'false' },
    } as unknown as Request;
    const res = makeRes();

    mockReportModel.aggregate.mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(),
        reviewRef: new mongoose.Types.ObjectId(),
        description: 'Spam',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        reporterUser: { email: 'user@test.com' },
        gameDoc: { title: 'Game A', slug: 'game-a' },
        reviewDoc: { authorName: 'Alice', body: 'bad', publicId: 'rev_test' },
      },
    ]);
    mockLegacyReviewReport.aggregate.mockResolvedValue([]);

    await adminListReviewReports(req, res);

    expect(mockReportModel.aggregate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            reportReason: 'Spam',
            gameTitle: 'Game A',
            reviewAuthorName: 'Alice',
            resolved: false,
          }),
        ]),
        total: 1,
      })
    );
  });

  it('resolves a review report and deletes review when requested', async () => {
    const reportId = new mongoose.Types.ObjectId().toHexString();
    const reviewId = new mongoose.Types.ObjectId().toHexString();
    const req = {
      params: { id: reportId },
      body: { action: 'delete-review' },
      user: { id: new mongoose.Types.ObjectId().toHexString() },
    } as unknown as Request;
    const res = makeRes();

    const saveSpy = jest.fn();
    mockReportModel.findOne = jest.fn().mockResolvedValue({
      _id: reportId,
      review: reviewId,
      resolved: false,
      save: saveSpy,
      toObject: jest.fn().mockReturnValue({ _id: reportId, outcome: 'deleted' }),
    });
    mockLegacyReviewReport.findById = jest.fn();
    mockReviewModel.findByIdAndDelete = jest.fn();

    await adminResolveReviewReport(req, res);

    expect(mockReviewModel.findByIdAndDelete).toHaveBeenCalledWith(reviewId);
    expect(saveSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
