import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { protect, authorize, blacklistToken } from '../../../middleware/auth';
import User from '../../models/user';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
  },
}));

jest.mock('../../models/user', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

const mockJwt = jwt as unknown as { verify: jest.Mock };
const mockUser = User as unknown as { findById: jest.Mock };

const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response & { status: jest.Mock; json: jest.Mock };
};

describe('auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('protect', () => {
    it('rejects when no token is provided', async () => {
      const req = { headers: {} } as unknown as Request;
      const res = makeRes();

      await protect(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorised to access this route. Please log in.',
        })
      );
    });

    it('rejects blacklisted tokens', async () => {
      const token = 'blacklisted-token';
      blacklistToken(token);

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request;
      const res = makeRes();

      await protect(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token has been revoked. Please log in again.',
        })
      );
    });

    it('rejects when jwt.verify throws', async () => {
      const token = 'bad-token';
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request;
      const res = makeRes();

      await protect(req, res, jest.fn());

      expect(mockJwt.verify).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('rejects when user not found', async () => {
      const token = 'valid-token';
      mockJwt.verify.mockReturnValue({ id: 'user-1' });
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request;
      const res = makeRes();

      await protect(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found. Please log in again.',
        })
      );
    });

    it('attaches user and calls next on success', async () => {
      const token = 'good-token';
      const next = jest.fn();
      mockJwt.verify.mockReturnValue({ id: 'user-1' });
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'user-1', role: 'admin' }),
      });

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as unknown as Request;
      const res = makeRes();

      await protect(req, res, next as unknown as NextFunction);

      expect(next).toHaveBeenCalled();
      expect((req as any).user).toEqual({ id: 'user-1', role: 'admin' });
    });
  });

  describe('authorize', () => {
    it('blocks when user missing', () => {
      const req = {} as Request;
      const res = makeRes();
      const next = jest.fn();

      authorize('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks when role not permitted', () => {
      const req = { user: { role: 'user' } } as unknown as Request;
      const res = makeRes();
      const next = jest.fn();

      authorize('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows when role permitted', () => {
      const req = { user: { role: 'admin' } } as unknown as Request;
      const res = makeRes();
      const next = jest.fn();

      authorize('admin')(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
