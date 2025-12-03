/**
 * Auth Routes - Complete Test Coverage
 * Tests signup, login, logout, password reset, and auth middleware
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authRouter from '../../routes/authRoutes';
import UserModel from '../../models/user';
import { sendEmail } from '../../services/emailService';

// Mock dependencies
jest.mock('../../models/user');
jest.mock('../../services/emailService');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const JWT_SECRET = process.env.JWT_SECRET || 'playable-secret';

const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: '$2a$10$hashedpassword',
  role: 'user',
  favourites: [],
  recentlyViewed: [],
  accessibilitySettings: {},
  save: jest.fn().mockResolvedValue(true),
};

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/auth/signup', () => {
    it('should create new user with valid data', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      (UserModel.prototype.save as jest.Mock).mockResolvedValue(mockUser);

      // Mock constructor
      (UserModel as any).mockImplementation(() => ({
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      }));

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'New User',
          email: 'new@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Account created successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toHaveProperty('email');
    });

    it('should reject signup with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All fields are required');
    });

    it('should reject when passwords do not match', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Different123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Password confirmation does not match');
    });

    it('should reject when email already exists', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'Test User',
          email: 'existing@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('An account with this email already exists');
    });

    it('should normalize email to lowercase', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      (UserModel as any).mockImplementation(() => ({
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      }));

      await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'Test User',
          email: 'TEST@EXAMPLE.COM',
          password: 'Password123',
          confirmPassword: 'Password123',
        });

      expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should handle database errors', async () => {
      (UserModel.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email and password are required');
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject login with non-existent email', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject login with incorrect password', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should normalize email to lowercase', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: 'password123',
        });

      expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should handle database errors during login', async () => {
      (UserModel.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return success message', async () => {
      const response = await request(app).post('/api/auth/logout').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const token = jwt.sign({ userId: mockUser._id.toString() }, JWT_SECRET);
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing or invalid token');
    });

    it('should reject request with invalid token format', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token verification failed');
    });

    it('should return 404 if user not found', async () => {
      const token = jwt.sign({ userId: mockUser._id.toString() }, JWT_SECRET);
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should handle database errors', async () => {
      const token = jwt.sign({ userId: mockUser._id.toString() }, JWT_SECRET);
      (UserModel.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/request-password-reset', () => {
    it('should send reset email for existing user', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (sendEmail as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset instructions sent');
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should return success even for non-existent email (security)', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should reject request without email', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email is required');
    });

    it('should normalize email to lowercase', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (sendEmail as jest.Mock).mockResolvedValue(true);

      await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'TEST@EXAMPLE.COM' });

      expect(UserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should handle email sending errors', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (sendEmail as jest.Mock).mockRejectedValue(new Error('Email service error'));

      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'test@example.com' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('could not send');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reject without required fields', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All fields are required');
    });

    it('should reject with invalid code', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'test@example.com',
          code: 'wrongcode',
          newPassword: 'NewPassword123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired reset code');
    });

    it('should return 404 if user not found', async () => {
      // First request reset to set code
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (sendEmail as jest.Mock).mockResolvedValue(true);

      await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: 'test@example.com' });

      // Get the reset code from the store (it's a 6-digit code)
      // For testing, we'll use a known code by checking what was sent
      const emailCallArgs = (sendEmail as jest.Mock).mock.calls[0];
      const emailBody = emailCallArgs[2];
      const codeMatch = emailBody.match(/\d{6}/);
      const code = codeMatch ? codeMatch[0] : '123456';

      // Now try reset with non-existent user
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'test@example.com',
          code,
          newPassword: 'NewPassword123',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });
});
