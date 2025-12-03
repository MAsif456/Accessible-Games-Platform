import mongoose from 'mongoose';
import { createReportHandler } from '../../routes/reports.routes';
import { ReportModel } from '../../models/report';

jest.mock('../../models/report', () => ({
  ReportModel: {
    create: jest.fn(),
  },
}));

/**
 * Creates a mock response object for Express route handlers.
 * The mock response object has `status` and `json` methods, which
 * both return the mock response object itself, allowing for chaining.
 * @returns {Object} A mock response object for Express route handlers.
 */
function createMockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('createReportHandler', () => {
  const mockedReportModel = ReportModel as unknown as { create: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when type is missing', async () => {
    const req: any = { body: { description: 'A valid description' } };
    const res = createMockRes();

    await createReportHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Report type is required.' });
    expect(mockedReportModel.create).not.toHaveBeenCalled();
  });

  it('rejects descriptions shorter than the minimum', async () => {
    const req: any = { body: { type: 'general', description: 'short' } };
    const res = createMockRes();

    await createReportHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Description must be at least 10 characters.',
    });
    expect(mockedReportModel.create).not.toHaveBeenCalled();
  });

  it('rejects descriptions longer than the maximum', async () => {
    const tooLong = 'a'.repeat(1001);
    const req: any = { body: { type: 'review', description: tooLong } };
    const res = createMockRes();

    await createReportHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Description must be under 1000 characters.',
    });
    expect(mockedReportModel.create).not.toHaveBeenCalled();
  });

  it('creates a report when payload is valid and trims description', async () => {
    mockedReportModel.create.mockResolvedValue({ id: 'abc123' });
    const gameId = new mongoose.Types.ObjectId().toHexString();
    const req: any = { body: { type: 'game', description: '   valid description   ', gameId } };
    const res = createMockRes();

    await createReportHandler(req, res);

    expect(mockedReportModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'game',
        description: 'valid description',
        game: expect.any(mongoose.Types.ObjectId),
        status: 'open',
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Report submitted successfully.',
      id: 'abc123',
    });
  });
});
