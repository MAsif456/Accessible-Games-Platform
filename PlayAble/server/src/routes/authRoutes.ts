// authRoutes.ts
// Defines authentication-related API endpoints, including registration, login, logout, and password reset.
// Routes are grouped by public and protected access for clarity and maintainability.
import express from 'express';
import { signup, login, logout, getMe, requestPasswordReset, resetPassword } from '../../controllers/authController';
import { protect } from '../../middleware/auth';

const router = express.Router();

// Public routes for account creation, login, and password reset requests.
router.post('/signup', signup);
router.post('/login', login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Protected routes require a valid JWT for access to user-specific data and logout.
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
