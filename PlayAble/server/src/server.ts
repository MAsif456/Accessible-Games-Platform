// server.ts
// Main entry point for the Express backend. Configures middleware, database connection, and API routes.
// Uses environment variables for configuration to support multiple deployment environments.
// All API responses are JSON for consistency and accessibility.
import dotenv from 'dotenv';
dotenv.config();
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import './models/user';
import authRoutes from '../routes/authRoutes';
import './models/settings';
import UserSettings from './models/settings';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for cross-origin requests from the frontend (Vite dev server).
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB. Connection string is loaded from environment variables for security and flexibility.
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/playabledb';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Health check endpoint for monitoring and deployment verification.
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Settings Routes
// For now, we'll use a temporary userId. In production, this would come from authentication
const TEMP_USER_ID = '507f1f77bcf86cd799439011'; // Placeholder ObjectId

// Get user settings
app.get('/api/settings', async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(TEMP_USER_ID);
    let settings = await UserSettings.findOne({ userId });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await UserSettings.create({ userId });
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
    const userId = new mongoose.Types.ObjectId(TEMP_USER_ID);
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
    const userId = new mongoose.Types.ObjectId(TEMP_USER_ID);

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

// Main authentication and user account routes.
app.use('/api/auth', authRoutes);

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

