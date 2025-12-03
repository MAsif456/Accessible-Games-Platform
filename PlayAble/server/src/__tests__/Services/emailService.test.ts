/**
 * Email Service - Complete Test Coverage
 * Tests email sending with mock mode, real mode, and error handling
 */

import nodemailer from 'nodemailer';

// Mock nodemailer before importing
jest.mock('nodemailer');

describe('Email Service', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  beforeEach(() => {
    consoleLogSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Mock Email Mode', () => {
    beforeAll(() => {
      process.env.USE_MOCK_EMAIL = 'true';
    });

    it('should log email to console in mock mode', async () => {
      // Dynamically import to get the mocked version
      const { sendEmail } = require('../../services/emailService');

      const result = await sendEmail('test@example.com', 'Test Subject', 'Test body');

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('MOCK EMAIL SERVICE'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
    });
  });

  describe('Real Email Mode - Missing Credentials', () => {
    beforeAll(() => {
      process.env.USE_MOCK_EMAIL = 'false';
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;
      // Clear module cache and reimport
      jest.resetModules();
    });

    it('should return false when credentials are missing', async () => {
      const { sendEmail } = require('../../services/emailService');

      const result = await sendEmail('test@example.com', 'Test', 'Content');

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Real Email Mode - Successful Sending', () => {
    it('should send email with nodemailer', async () => {
      // Clear cache first
      jest.resetModules();

      // Set up environment variables
      process.env.USE_MOCK_EMAIL = 'false';
      process.env.EMAIL_USER = 'sender@example.com';
      process.env.EMAIL_PASS = 'password123';

      // Set up mock AFTER clearing cache
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
      const nodemailerMock = require('nodemailer');
      (nodemailerMock.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });

      // Import after everything is set up
      const { sendEmail } = require('../../services/emailService');

      const result = await sendEmail('recipient@example.com', 'Test', 'Body');

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle SMTP errors gracefully', async () => {
      // Set up environment and mock BEFORE resetting modules
      process.env.USE_MOCK_EMAIL = 'false';
      process.env.EMAIL_USER = 'sender@example.com';
      process.env.EMAIL_PASS = 'password';

      const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP error'));
      (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });

      // Now reset modules and reimport with the correct env vars
      jest.resetModules();
      const { sendEmail } = require('../../services/emailService');

      const result = await sendEmail('test@example.com', 'Test', 'Content');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
