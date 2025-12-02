import { createReportHandler } from '../../routes/reports.routes';
import { ReportModel } from '../../models/report';

jest.mock('../../models/report', () => ({
  ReportModel: {
    create: jest.fn(),
  },
}));

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
    const req: any = { body: { type: 'game', description: '   valid description   ', gameId: 'gid' } };
    const res = createMockRes();

    await createReportHandler(req, res);

    expect(mockedReportModel.create).toHaveBeenCalledWith({
      type: 'game',
      description: 'valid description',
      transcript: undefined,
      issueType: undefined,
      game: 'gid',
      review: undefined,
      reporterId: undefined,
      reporterEmail: undefined,
      reporterName: undefined,
      status: 'open',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Report submitted successfully.',
      id: 'abc123',
    });
  });
});
