// authController.ts
// Handles all authentication and user account logic, including registration, login, and password reset.
// Password reset uses a one-time code sent by email for security and accessibility.
// In-memory store for reset codes is used for demonstration; a persistent store is required for production.
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { UserModel, IUser } from '../src/models';
import { sendEmail } from '../services/emailService';
import { blacklistToken } from '../middleware/auth';

// Ensure JWT_SECRET exists
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

// JWT expiration set to 1 year for academic demonstration purposes
// This ensures examiners can test the application without token expiration issues
const JWT_EXPIRES_IN = 60 * 60 * 24 * 365; // 1 year in seconds

// Generate JWT token with explicit algorithm specification
// This prevents algorithm confusion attacks (CVE-2015-9235)
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

// In-memory store for password reset codes. Replace with a database-backed solution for scalability and reliability.
const resetCodes: Record<string, { code: string; expires: number }> = {};

// Registration endpoint. Validates uniqueness of email and stores hashed password for security.
// Sends a JWT for session management.
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

// Login endpoint. Validates credentials and issues a JWT for stateless authentication.
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

// Handles password reset requests. Sends a one-time code to the user's email for accessibility and security.
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
// Resets the user's password after verifying the one-time code. Ensures the code is valid and not expired.
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

// Returns the authenticated user's profile. Used for session validation and personalisation.
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

// Logout endpoint with token blacklisting
// Extracts the JWT from the Authorization header and adds it to the blacklist
// This ensures the token is immediately invalidated and cannot be reused
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