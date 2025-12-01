/**
 * Authentication Controller
 *
 * @module authController
 * @description
 * Handles all authentication and user account logic, including registration, login, logout, and password reset.
 *
 * **Security Features:**
 * - Bcrypt password hashing
 * - JWT-based stateless authentication with explicit HS256 algorithm
 * - Token blacklisting on logout
 * - Email-based password reset with time-limited codes
 */
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { UserModel, IUser } from '../src/models';
import { sendEmail } from '../services/emailService';
import { blacklistToken } from '../middleware/auth';

/**
 * JWT secret key from environment variables.
 * @constant {string}
 */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

/**
 * JWT expiration time (1 year for academic demonstration).
 * @constant {number}
 */
const JWT_EXPIRES_IN = 60 * 60 * 24 * 365; // 1 year in seconds

/**
 * Generates a JWT token with explicit HS256 algorithm to prevent algorithm confusion attacks.
 *
 * @param {string} userId - MongoDB ObjectId
 * @returns {string} Signed JWT token
 */
const generateToken = (userId: string): string => {
  return jwt.sign(
    { id: userId },
    JWT_SECRET!,
    {
      expiresIn: JWT_EXPIRES_IN,
      algorithm: 'HS256' // Explicitly specify HMAC SHA-256
    }
  );
};

/**
 * In-memory store for password reset codes (use Redis in production).
 * @type {Record<string, { code: string; expires: number }>}
 */
const resetCodes: Record<string, { code: string; expires: number }> = {};

/**
 * User registration endpoint.
 *
 * @param {Request} req - Express request with fullName, email, password, confirmPassword
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 *
 * @description
 * Creates new user account with hashed password and returns JWT token.
 *
 * @security Password automatically hashed by User model pre-save hook
 *
 * @example
 * POST /api/auth/signup
 * Body: { fullName: 'John Doe', email: 'john@example.com', password: 'Pass123!', confirmPassword: 'Pass123!' }
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
      return;
    }

    // Create new user (using 'name' and 'passwordHash' to match your schema)
    const user = await UserModel.create({
      name: fullName,
      email,
      passwordHash: password,
      role: 'user',
    });

    // Generate token
    const token = generateToken(user._id.toString());

    // Send response
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        favourites: user.favourites,
        recentlyViewed: user.recentlyViewed,
        accessibilitySettings: user.accessibilitySettings,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account. Please try again.',
      error: error.message,
    });
  }
};

/**
 * User login endpoint.
 *
 * @param {Request} req - Express request with email and password
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 *
 * @description
 * Authenticates user credentials and returns JWT token on success.
 *
 * **Security Considerations:**
 * - Uses bcrypt password comparison (constant-time to prevent timing attacks)
 * - Returns generic error message to prevent user enumeration
 * - Explicitly selects passwordHash field (excluded by default)
 *
 * @example
 * POST /api/auth/login
 * Body: { email: 'john@example.com', password: 'Pass123!' }
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email (select passwordHash explicitly)
    const user = await UserModel.findOne({ email }).select('+passwordHash');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate token
    const token = generateToken(user._id.toString());

    // Send response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        favourites: user.favourites,
        recentlyViewed: user.recentlyViewed,
        accessibilitySettings: user.accessibilitySettings,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in. Please try again.',
      error: error.message,
    });
  }
};

/**
 * Password reset request endpoint.
 *
 * @param {Request} req - Express request with email
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 *
 * @description
 * Generates and emails a 6-digit verification code for password reset.
 *
 * **Security:**
 * - Always returns success to prevent user enumeration
 * - Code expires after 15 minutes
 * - Uses email delivery for verification
 *
 * @example
 * POST /api/auth/request-password-reset
 * Body: { email: 'john@example.com' }
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email });
  if (!user) {
    res.status(200).json({ success: true }); // Don't reveal if user exists
    return;
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  resetCodes[email] = { code, expires: Date.now() + 15 * 60 * 1000 };
  
  const emailSubject = 'Password Reset Request - PlayAble';
  const emailBody = `Dear ${user.fullName || 'User'},

We have received a request to reset the password for your PlayAble account associated with this email address.

Your password reset verification code is:

${code}

Please enter this code on the password reset page to continue. This code will expire in 15 minutes for security purposes.

If you did not request a password reset, please ignore this email and ensure your account remains secure. Your password will not be changed unless the verification code is used.

For assistance or security concerns, please contact our support team.

Best regards,
The PlayAble Team

---
This is an automated message, please do not reply to this email.`;

  const emailSent = await sendEmail(email, emailSubject, emailBody);

  if (!emailSent) {
    console.error(`[authController] Failed to send password reset email to ${email}`);
    // Still return success to avoid revealing if email exists, but log the error
    // In production, you might want to queue this for retry
  }

  res.json({ success: true });
};

/**
 * Password reset completion endpoint.
 *
 * @param {Request} req - Express request with email, code, and newPassword
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 *
 * @description
 * Verifies reset code and updates user password.
 *
 * **Validation:**
 * - Code must match and not be expired
 * - User must exist
 * - Password hashed automatically by model
 *
 * **Side Effects:**
 * - Removes code from store after use
 *
 * @example
 * POST /api/auth/reset-password
 * Body: { email: 'john@example.com', code: '123456', newPassword: 'NewPass123!' }
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, code, newPassword } = req.body;
  const entry = resetCodes[email];
  if (!entry || entry.code !== code || entry.expires < Date.now()) {
    res.status(400).json({ success: false, message: 'Invalid or expired code.' });
    return;
  }
  const user = await UserModel.findOne({ email });
  if (!user) {
    res.status(400).json({ success: false, message: 'User not found.' });
    return;
  }
  user.passwordHash = newPassword;
  await user.save();
  delete resetCodes[email];
  res.json({ success: true });
};

/**
 * Get current user profile endpoint.
 *
 * @param {Request & { user?: { id: string } }} req - Express request with authenticated user
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 *
 * @description
 * Returns current user's profile data for session validation and display.
 * Excludes password hash from response.
 *
 * @security Requires JWT authentication
 *
 * @example
 * GET /api/auth/me
 */
export const getMe = async (req: Request & { user?: { id: string } }, res: Response): Promise<void> => {
  try {
    const user = await UserModel.findById(req.user?.id).select('-passwordHash');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        favourites: user.favourites,
        recentlyViewed: user.recentlyViewed,
        accessibilitySettings: user.accessibilitySettings,
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message,
    });
  }
};

/**
 * User logout endpoint with token blacklisting.
 *
 * @param {Request} req - Express request with Authorization header
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 *
 * @description
 * Logs out user by blacklisting their JWT token, preventing reuse.
 *
 * **Security:**
 * - Extracts token from Authorization header
 * - Adds token to blacklist immediately
 * - Makes token invalid for future requests
 *
 * @example
 * POST /api/auth/logout
 * Headers: { Authorization: 'Bearer <token>' }
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Add token to blacklist to prevent reuse
      blacklistToken(token);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message,
    });
  }
};

/**
 * Update user profile endpoint (name and bio only).
 *
 * @param {Request & { user?: { id: string } }} req - Express request with name and/or bio
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 *
 * @description
 * Updates user's display name and/or bio. Trims whitespace automatically.
 *
 * **Validation:**
 * - Name must be non-empty after trimming
 * - Bio can be empty string
 *
 * @security Requires JWT authentication. CSRF protected.
 *
 * @example
 * PUT /api/auth/profile
 * Body: { name: 'New Name', bio: 'Updated bio' }
 */
export const updateProfile = async (
  req: Request & { user?: { id: string } },
  res: Response
): Promise<void> => {
  try {
    const { name, bio } = req.body as { name?: string; bio?: string };

    const user = await UserModel.findById(req.user?.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }
    if (typeof bio === 'string') {
      user.bio = bio.trim();
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        favourites: user.favourites,
        recentlyViewed: user.recentlyViewed,
        accessibilitySettings: user.accessibilitySettings,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error updating profile', error: error.message });
  }
};

/**
 * Update email and/or password endpoint.
 *
 * @param {Request & { user?: { id: string } }} req - Express request with newEmail, currentPassword, newPassword
 * @param {Response} res - Express response
 * @returns {Promise<void>}
 *
 * @description
 * Allows users to change their email address and/or password.
 *
 * **Validation:**
 * - Changing password requires current password verification
 * - New email must not be already in use
 * - Password automatically hashed by model pre-save hook
 *
 * **Security:**
 * - Verifies current password before allowing change
 * - Checks email uniqueness
 * - CSRF protected
 *
 * @security Requires JWT authentication. CSRF protected.
 *
 * @example
 * PUT /api/auth/account
 * Body: { newEmail: 'newemail@example.com', currentPassword: 'OldPass123!', newPassword: 'NewPass123!' }
 */
export const updateEmailAndPassword = async (
  req: Request & { user?: { id: string } },
  res: Response
): Promise<void> => {
  try {
    const { newEmail, currentPassword, newPassword } = req.body as {
      newEmail?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const user = await UserModel.findById(req.user?.id).select('+passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        res
          .status(400)
          .json({ success: false, message: 'Current password is required' });
        return;
      }
      const isCurrentValid = await user.comparePassword(currentPassword);
      if (!isCurrentValid) {
        res
          .status(400)
          .json({ success: false, message: 'Current password is incorrect' });
        return;
      }
      user.passwordHash = newPassword;
    }

    if (newEmail && newEmail !== user.email) {
      const existing = await UserModel.findOne({ email: newEmail });
      if (existing) {
        res.status(400).json({ success: false, message: 'Email is already in use' });
        return;
      }
      user.email = newEmail.toLowerCase();
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        favourites: user.favourites,
        recentlyViewed: user.recentlyViewed,
        accessibilitySettings: user.accessibilitySettings,
      },
    });
  } catch (error: any) {
    console.error('Update email/password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating account details',
      error: error.message,
    });
  }
};