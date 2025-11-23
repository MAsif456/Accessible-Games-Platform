import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, IUser } from '../src/models';


// Ensure JWT_SECRET exists
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (userId: string): string => {
  // Try using only a number for expiresIn to match the type definition
  // Default to 7 days in seconds if JWT_EXPIRES_IN is not a valid number
  let expiresIn: number = 60 * 60 * 24 * 7; // 7 days
  if (typeof JWT_EXPIRES_IN === 'string' && /^\d+$/.test(JWT_EXPIRES_IN)) {
    expiresIn = parseInt(JWT_EXPIRES_IN, 10);
  }
  return jwt.sign(
    { id: userId },
    JWT_SECRET!,
    { expiresIn }
  );
};
// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
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

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
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

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
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

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // In a token-based auth system, logout is handled client-side by removing the token
    // But we can still send a success response
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