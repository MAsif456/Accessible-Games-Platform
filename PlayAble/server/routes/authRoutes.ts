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

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/profile', protect, updateProfile);
router.put('/account', protect, updateEmailAndPassword);

export default router;