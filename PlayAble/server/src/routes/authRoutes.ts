// authRoutes.ts
// Canonical auth routes for the backend. All authentication-related endpoints are defined here.

import express from 'express';
import {
  signup,
  login,
  logout,
  getMe,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  updateEmailAndPassword,
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import {
  loginLimiter,
  signupLimiter,
  passwordResetLimiter
} from '../middleware/rateLimiting';

const router = express.Router();

// Public routes with rate limiting
router.post('/login', loginLimiter, login);
router.post('/signup', signupLimiter, signup);
router.post('/request-password-reset', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/profile', protect, updateProfile);
router.put('/account', protect, updateEmailAndPassword);

export default router;
