import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import UserModel from '../models/user';
import { sendEmail } from '../services/emailService';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'playable-secret';
const TOKEN_EXPIRES_IN = '7d';

type ResetRecord = {
  code: string;
  expiresAt: number;
};

const resetStore: Map<string, ResetRecord> = new Map();

const createToken = (userId: string) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });

const sanitizeUser = (user: any) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  favourites: user.favourites || [],
  recentlyViewed: user.recentlyViewed || [],
  accessibilitySettings: user.accessibilitySettings,
});

interface AuthedRequest extends Request {
  userId?: string;
}

const authMiddleware = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token verification failed' });
  }
};

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'Password confirmation does not match' });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: 'An account with this email already exists' });
    }

    const user = new UserModel({
      name: fullName,
      email: normalizedEmail,
      passwordHash: password,
    });

    await user.save();

    const token = createToken(user._id.toString());

    return res.json({
      success: true,
      message: 'Account created successfully',
      token,
      user: sanitizeUser(user),
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create account',
    });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = createToken(user._id.toString());

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to log in',
    });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'Logged out' });
});

router.get('/me', authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: sanitizeUser(user) });
  } catch (error: any) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load user',
    });
  }
});

router.post('/request-password-reset', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase();
  const user = await UserModel.findOne({ email: normalizedEmail });

  if (!user) {
    return res.json({
      success: true,
      message: 'If an account exists, a reset link has been sent',
    });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  resetStore.set(normalizedEmail, {
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  try {
    await sendEmail(
      normalizedEmail,
      'PlayAble Password Reset',
      `Hello ${user.name || 'Player'},

We received a request to reset your PlayAble password. Use the verification code below to finish resetting your password:

${code}

This code expires in 15 minutes. If you did not request a reset, you can safely ignore this email.

— PlayAble Support`
    );
  } catch (error) {
    console.error('Password reset email failed:', error);
    return res.status(500).json({
      success: false,
      message: 'We could not send the reset email. Please try again later.',
    });
  }

  return res.json({
    success: true,
    message: 'Password reset instructions sent',
  });
});

router.post('/reset-password', async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const normalizedEmail = email.toLowerCase();
  const record = resetStore.get(normalizedEmail);

  if (!record || record.code !== code || record.expiresAt < Date.now()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset code' });
  }

  const user = await UserModel.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  user.passwordHash = newPassword;
  await user.save();
  resetStore.delete(normalizedEmail);

  return res.json({ success: true, message: 'Password reset successfully' });
});

export default router;

