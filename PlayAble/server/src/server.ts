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

