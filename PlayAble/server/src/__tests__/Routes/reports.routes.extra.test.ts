import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

jest.mock('../../middleware/auth', () => ({
  protect: (req: any, _res: any, next: any) => {
    const userId = req.headers['x-user-id'];
    const email = req.headers['x-user-email'];
    if (userId || email) {
      req.user = { id: userId, email };
    }
    next();
  },
}));

const mockCreate = jest.fn();
const mockFindById = jest.fn();

jest.mock('../../models/report', () => ({
  ReportModel: {
    create: (...args: any[]) => mockCreate(...args),
    findById: (...args: any[]) => mockFindById(...args),
  },
}));

import reportsRouter from '../../routes/reports.routes';

const app = express();
app.use(express.json());
app.use(reportsRouter);

const makeQuery = (report: any) => {
  const query: any = {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(report),
  };
  query.populate.mockReturnValue(query);
  return query;
};

describe('reports.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects general report with invalid email', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('x-user-id', 'user-1')
      .send({ type: 'general', description: 'valid reason text', reporterEmail: 'bad-email' })
      .expect(400);

    expect(res.body.message).toContain('valid email address');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates general report when email valid', async () => {
    mockCreate.mockResolvedValue({ _id: 'id-1' });
    await request(app)
      .post('/api/reports')
      .set('x-user-id', '507f1f77bcf86cd799439011')
      .set('x-user-email', 'auth@example.com')
      .send({
        type: 'general',
        description: 'valid reason text',
        reporterEmail: 'valid@example.com',
      })
      .expect(201);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'general',
        reporterEmail: 'valid@example.com',
        reporterId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      })
    );
  });

  it('requires reviewId for review reports', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ type: 'review', description: 'valid reason text' })
      .expect(400);

    expect(res.body.message).toBe('Review ID is required for review reports.');
  });

  it('fetches report by id and enforces ownership', async () => {
    const reportId = new mongoose.Types.ObjectId().toHexString();

    // Invalid id format
    await request(app).get('/api/reports/not-an-id').expect(400);

    // Not found path
    mockFindById.mockReturnValue(makeQuery(null));
    await request(app).get(`/api/reports/${reportId}`).expect(404);

    // Forbidden when reporterId differs
    mockFindById.mockReturnValue(
      makeQuery({ reporterId: new mongoose.Types.ObjectId(), _id: reportId })
    );
    await request(app)
      .get(`/api/reports/${reportId}`)
      .set('x-user-id', new mongoose.Types.ObjectId().toHexString())
      .expect(403);

    // Success when reporter matches
    const ownerId = new mongoose.Types.ObjectId();
    mockFindById.mockReturnValue(
      makeQuery({
        _id: reportId,
        reporterId: ownerId,
        game: { title: 'Game', slug: 'game' },
        review: { body: 'Body' },
      })
    );

    const res = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('x-user-id', ownerId.toHexString())
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.report._id).toBe(reportId);
  });
});
