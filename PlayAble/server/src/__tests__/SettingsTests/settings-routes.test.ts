/**
 * Settings API Routes Tests
 *
 * Tests verify that settings endpoints work correctly:
 * 1. GET /api/settings - Fetches user settings, creates defaults if none exist
 * 2. PUT /api/settings - Updates user settings
 * 3. POST /api/settings/reset - Resets settings to defaults
 *
 * These tests ensure settings are properly saved and retrieved from the database.
 *
 * Prerequisites:
 * - MongoDB must be running on localhost:27017
 * - Test database: playable_test
 *
 * @group settings
 * @group api
 */

import mongoose from 'mongoose';
import request from 'supertest';
import express, { Express } from 'express';
import UserSettings from '../../models/settings';
import dotenv from 'dotenv';

// Load environment variables (same as server)
dotenv.config();

describe('Settings API Routes', () => {
  let app: Express;
  const testUserId = new mongoose.Types.ObjectId().toHexString();

  // Helper function to create a test app with settings routes
  const createTestApp = () => {
    const testApp = express();
    testApp.use(express.json());

    // Mock resolveUserId function (matches server implementation)
    const pickFirstString = (value: any): string | undefined => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && value.length > 0) return String(value[0]);
      return undefined;
    };

    const resolveUserId = (req: any): mongoose.Types.ObjectId | null => {
      const headerId = pickFirstString(req.headers['x-user-id']);
      const queryId = pickFirstString(req.query?.userId);
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

    // GET /api/settings
    testApp.get('/api/settings', async (req: any, res: any) => {
      try {
        const userId = resolveUserId(req);
        if (!userId) {
          return res.status(400).json({ error: 'User ID is required to fetch settings' });
        }

        let settings = await UserSettings.findOne({ userId });
        if (!settings) {
          const defaultSettings = {
            userId,
            voiceInput: true,
            captions: true,
            microphoneActive: true,
            highContrastMode: false,
            highContrastTheme: 'white',
            reducedMotion: false,
            darkMode: false,
          };

          try {
            settings = await UserSettings.create(defaultSettings);
          } catch (createError: any) {
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

    // PUT /api/settings
    testApp.put('/api/settings', async (req: any, res: any) => {
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
            userId,
            voiceInput,
            captions,
            microphoneActive,
            highContrastMode,
            highContrastTheme: highContrastTheme || 'white',
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

    // POST /api/settings/reset
    testApp.post('/api/settings/reset', async (req: any, res: any) => {
      try {
        const userId = resolveUserId(req);
        if (!userId) {
          return res.status(400).json({ error: 'User ID is required to reset settings' });
        }

        const settings = await UserSettings.findOneAndUpdate(
          { userId },
          {
            userId,
            voiceInput: true,
            captions: true,
            microphoneActive: true,
            highContrastMode: false,
            highContrastTheme: 'white',
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

    return testApp;
  };

  beforeAll(async () => {
    // Disconnect any existing connections first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Connect to test database with timeout
    // Use the same connection string as the server, but with test database name
    // The server uses: process.env.MONGODB_URI || 'mongodb://localhost:27017/playabledb'
    // For tests, we use a separate test database
    const serverMongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/playabledb';
    // Replace database name with test database
    const mongoUri = serverMongoUri.replace(/\/[^\/]+$/, '/playable_test');
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
      });
      app = createTestApp();
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      console.error('Make sure MongoDB is running on localhost:27017');
      console.error('The server uses:', process.env.MONGODB_URI || 'mongodb://localhost:27017/playabledb');
      throw error;
    }
  }, 15000); // 15 second timeout

  afterAll(async () => {
    // Clean up test database
    try {
      await UserSettings.deleteMany({ userId: testUserId });
      // Only close if we opened the connection in this test
      if (mongoose.connection.readyState === 1 && mongoose.connection.name === 'playable_test') {
        await mongoose.connection.close();
      }
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    }
  }, 10000);

  beforeEach(async () => {
    // Clean up settings before each test
    await UserSettings.deleteMany({ userId: testUserId });
  });

  describe('GET /api/settings', () => {
    it('should return 400 when user ID is missing', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect(400);

      expect(response.body.error).toBe('User ID is required to fetch settings');
    });

    it('should create default settings when none exist', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('X-User-Id', testUserId)
        .expect(200);

      // userId is returned as ObjectId string, so we compare as strings
      expect(String(response.body.userId)).toBe(testUserId);
      expect(response.body.voiceInput).toBe(true);
      expect(response.body.captions).toBe(true);
      expect(response.body.microphoneActive).toBe(true);
      expect(response.body.highContrastMode).toBe(false);
      expect(response.body.highContrastTheme).toBe('white');
      expect(response.body.reducedMotion).toBe(false);
      expect(response.body.darkMode).toBe(false);
    });

    it('should return existing settings when they exist', async () => {
      // Create settings first
      await UserSettings.create({
        userId: testUserId,
        voiceInput: false,
        captions: false,
        microphoneActive: false,
        highContrastMode: true,
        highContrastTheme: 'black',
        reducedMotion: true,
        darkMode: true,
      });

      const response = await request(app)
        .get('/api/settings')
        .set('X-User-Id', testUserId)
        .expect(200);

      // userId is returned as ObjectId string, so we compare as strings
      expect(String(response.body.userId)).toBe(testUserId);
      expect(response.body.voiceInput).toBe(false);
      expect(response.body.captions).toBe(false);
      expect(response.body.microphoneActive).toBe(false);
      expect(response.body.highContrastMode).toBe(true);
      expect(response.body.highContrastTheme).toBe('black');
      expect(response.body.reducedMotion).toBe(true);
      expect(response.body.darkMode).toBe(true);
    });
  });

  describe('PUT /api/settings', () => {
    it('should return 400 when user ID is missing', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({
          voiceInput: false,
        })
        .expect(400);

      expect(response.body.error).toBe('User ID is required to update settings');
    });

    it('should create settings when they do not exist', async () => {
      const response = await request(app)
        .put('/api/settings')
        .set('X-User-Id', testUserId)
        .send({
          voiceInput: false,
          captions: false,
          microphoneActive: false,
          highContrastMode: true,
          highContrastTheme: 'white',
          reducedMotion: true,
          darkMode: true,
        })
        .expect(200);

      // userId is returned as ObjectId string, so we compare as strings
      expect(String(response.body.userId)).toBe(testUserId);
      expect(response.body.voiceInput).toBe(false);
      expect(response.body.captions).toBe(false);
      expect(response.body.microphoneActive).toBe(false);
      expect(response.body.highContrastMode).toBe(true);
      expect(response.body.highContrastTheme).toBe('white');
      expect(response.body.reducedMotion).toBe(true);
      expect(response.body.darkMode).toBe(true);
    });

    it('should update existing settings', async () => {
      // Create initial settings
      await UserSettings.create({
        userId: testUserId,
        voiceInput: true,
        captions: true,
        microphoneActive: true,
        highContrastMode: false,
        highContrastTheme: 'white',
        reducedMotion: false,
        darkMode: false,
      });

      // Update settings
      const response = await request(app)
        .put('/api/settings')
        .set('X-User-Id', testUserId)
        .send({
          voiceInput: false,
          captions: false,
          microphoneActive: false,
          highContrastMode: true,
          highContrastTheme: 'black',
          reducedMotion: true,
          darkMode: true,
        })
        .expect(200);

      // userId is returned as ObjectId string, so we compare as strings
      expect(String(response.body.userId)).toBe(testUserId);
      expect(response.body.voiceInput).toBe(false);
      expect(response.body.captions).toBe(false);
      expect(response.body.microphoneActive).toBe(false);
      expect(response.body.highContrastMode).toBe(true);
      expect(response.body.highContrastTheme).toBe('black');
      expect(response.body.reducedMotion).toBe(true);
      expect(response.body.darkMode).toBe(true);
    });

    it('should update partial settings', async () => {
      // Create initial settings
      await UserSettings.create({
        userId: testUserId,
        voiceInput: true,
        captions: true,
        microphoneActive: true,
        highContrastMode: false,
        highContrastTheme: 'white',
        reducedMotion: false,
        darkMode: false,
      });

      // Update only high contrast mode
      const response = await request(app)
        .put('/api/settings')
        .set('X-User-Id', testUserId)
        .send({
          highContrastMode: true,
          highContrastTheme: 'black',
        })
        .expect(200);

      expect(response.body.highContrastMode).toBe(true);
      expect(response.body.highContrastTheme).toBe('black');
      // Other settings should remain unchanged
      expect(response.body.voiceInput).toBe(true);
      expect(response.body.captions).toBe(true);
      expect(response.body.microphoneActive).toBe(true);
    });

    it('should use default theme when highContrastTheme is not provided', async () => {
      const response = await request(app)
        .put('/api/settings')
        .set('X-User-Id', testUserId)
        .send({
          highContrastMode: true,
          // highContrastTheme not provided
        })
        .expect(200);

      expect(response.body.highContrastMode).toBe(true);
      expect(response.body.highContrastTheme).toBe('white');
    });

    it('should persist settings to database', async () => {
      // Update settings
      await request(app)
        .put('/api/settings')
        .set('X-User-Id', testUserId)
        .send({
          voiceInput: false,
          highContrastMode: true,
          darkMode: true,
        })
        .expect(200);

      // Verify settings were saved
      const savedSettings = await UserSettings.findOne({ userId: testUserId });
      expect(savedSettings).not.toBeNull();
      expect(savedSettings?.voiceInput).toBe(false);
      expect(savedSettings?.highContrastMode).toBe(true);
      expect(savedSettings?.darkMode).toBe(true);
    });
  });

  describe('POST /api/settings/reset', () => {
    it('should return 400 when user ID is missing', async () => {
      const response = await request(app)
        .post('/api/settings/reset')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('User ID is required to reset settings');
    });

    it('should reset settings to defaults', async () => {
      // Create custom settings first
      await UserSettings.create({
        userId: testUserId,
        voiceInput: false,
        captions: false,
        microphoneActive: false,
        highContrastMode: true,
        highContrastTheme: 'black',
        reducedMotion: true,
        darkMode: true,
      });

      // Reset settings
      const response = await request(app)
        .post('/api/settings/reset')
        .set('X-User-Id', testUserId)
        .send({})
        .expect(200);

      expect(response.body.message).toBe('Settings reset to defaults');
      expect(response.body.settings.userId).toBe(testUserId);
      expect(response.body.settings.voiceInput).toBe(true);
      expect(response.body.settings.captions).toBe(true);
      expect(response.body.settings.microphoneActive).toBe(true);
      expect(response.body.settings.highContrastMode).toBe(false);
      expect(response.body.settings.highContrastTheme).toBe('white');
      expect(response.body.settings.reducedMotion).toBe(false);
      expect(response.body.settings.darkMode).toBe(false);
    });

    it('should create default settings if they do not exist', async () => {
      const response = await request(app)
        .post('/api/settings/reset')
        .set('X-User-Id', testUserId)
        .send({})
        .expect(200);

      expect(response.body.settings.userId).toBe(testUserId);
      expect(response.body.settings.voiceInput).toBe(true);
      expect(response.body.settings.captions).toBe(true);
      expect(response.body.settings.microphoneActive).toBe(true);
      expect(response.body.settings.highContrastMode).toBe(false);
      expect(response.body.settings.highContrastTheme).toBe('white');
      expect(response.body.settings.reducedMotion).toBe(false);
      expect(response.body.settings.darkMode).toBe(false);
    });
  });
});

