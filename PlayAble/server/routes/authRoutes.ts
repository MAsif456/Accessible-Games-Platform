// authRoutes.ts (root-level routes folder)
// Canonical auth routes for the backend. The previous src/routes copy has been removed.
// All authentication-related endpoints are defined here.

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
} from '../src/middleware/rateLimiting';

const router = express.Router();

// Public routes with rate limiting
// Login: 5 attempts per 15 minutes (prevents brute force attacks)
router.post('/login', loginLimiter, login);

// Signup: 3 attempts per hour (prevents mass account creation)
router.post('/signup', signupLimiter, signup);

// Password reset: 3 attempts per hour (prevents email flooding)
router.post('/request-password-reset', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/profile', protect, updateProfile);
router.put('/account', protect, updateEmailAndPassword);

export default router;