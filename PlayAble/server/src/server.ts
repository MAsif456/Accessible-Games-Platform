// server.ts
// Main entry point for the Express backend. Configures middleware, database connection, and API routes.
// Uses environment variables for configuration to support multiple deployment environments.
// All API responses are JSON for consistency and accessibility.
import dotenv from 'dotenv';
dotenv.config();
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import UserModel, { seedAdminUserIfNotExists } from './models/user';
import GameModel, { seedGamesIfEmpty } from './models/game';
import gamesRouter from '../routes/games.routes';
import authRoutes from '../routes/authRoutes';
import './models/settings';
import UserSettings from './models/settings';
import favouritesRoutes from './routes/favourites.routes';
import reportsRoutes from './routes/reports.routes';
import reviewsRoutes from './routes/reviews.routes';
import reviewReportsRoutes from './routes/reviewReports.routes';
import recentlyViewedRoutes from './routes/recentlyViewed.routes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for cross-origin requests from the frontend (Vite dev server).
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static images
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/playabledb';

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    // Seed games collection from JSON if empty
    await seedGamesIfEmpty();
    
    // Seed admin user if it doesn't exist
    await seedAdminUserIfNotExists();
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
  });

// Health check endpoint for monitoring and deployment verification.
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Games API routes
app.use('/api', gamesRouter);
app.use('/api/auth', authRoutes);
app.use('/api/favourites', favouritesRoutes);
app.use(reportsRoutes);
app.use('/api', reviewsRoutes);
app.use('/api', reviewReportsRoutes);
app.use('/api', recentlyViewedRoutes);

// Fix syntax error in `pickFirstString` function
const pickFirstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === 'string') return first;
  }
  return undefined;
};

const resolveUserId = (req: Request) => {
  const headerId = pickFirstString(req.headers['x-user-id']);
  const queryId = pickFirstString(req.query.userId);
  const bodyId = pickFirstString(req.body?.userId);

  const rawId = headerId || queryId || bodyId;

  if (!rawId) {
    return null;
  }

  try {
    return new mongoose.Types.ObjectId(rawId);
  } catch {
    return null;
  }
};

// Get user settings
app.get('/api/settings', async (req: Request, res: Response) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to fetch settings' });
    }

    // First try to find existing settings
    let settings = await UserSettings.findOne({ userId });

    // If no settings exist, create default settings
    if (!settings) {
      const defaultSettings = {
        userId,
        voiceInput: true,
        captions: true,
        microphoneActive: true,
        highContrastMode: false,
        highContrastTheme: 'tidepool',
        reducedMotion: false,
        darkMode: false,
      };

      try {
        settings = await UserSettings.create(defaultSettings);
      } catch (createError: any) {
        // If duplicate key error (race condition), fetch the existing one
        if (createError.code === 11000) {
          settings = await UserSettings.findOne({ userId });
        } else {
          throw createError;
        }
      }
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update user settings
app.put('/api/settings', async (req: Request, res: Response) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to update settings' });
    }

    const {
      voiceInput,
      captions,
      microphoneActive,
      highContrastMode,
      highContrastTheme,
      reducedMotion,
      darkMode,
    } = req.body;

    const settings = await UserSettings.findOneAndUpdate(
      { userId },
      {
        voiceInput,
        captions,
        microphoneActive,
        highContrastMode,
        highContrastTheme: highContrastTheme || 'tidepool',
        reducedMotion,
        darkMode,
      },
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Reset settings to defaults
app.post('/api/settings/reset', async (req: Request, res: Response) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required to reset settings' });
    }

    const settings = await UserSettings.findOneAndUpdate(
      { userId },
      {
        voiceInput: true,
        captions: true,
        microphoneActive: true,
        highContrastMode: false,
        highContrastTheme: 'tidepool',
        reducedMotion: false,
        darkMode: false,
      },
      { new: true, upsert: true }
    );

    res.json({ message: 'Settings reset to defaults', settings });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

// 404 handler for unknown API routes. Ensures all errors are returned as JSON for frontend consistency.
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Global error handler for catching unexpected errors and returning a standard JSON response.
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// Start the server. Port is configurable via environment variables for deployment flexibility.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
