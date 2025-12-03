/**
 * SignInPage - Test Coverage for Authentication Flows
 * Tests sign in, sign up, validation, tab switching, and password visibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignInPage from '../SignInPage';
import { useAuth } from '../../context/AuthContext';
import * as apiHelper from '../../utils/apiHelper';

// Mock dependencies
jest.mock('../../context/AuthContext');
jest.mock('../../utils/apiHelper');
jest.mock('../../hooks/useVoiceRecording', () => ({
  useVoiceRecording: () => ({
    transcript: '',
    isRecording: false,
    error: null,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    clearTranscript: jest.fn(),
  }),
}));
jest.mock('../../context/VoiceAssistantContext', () => ({
  useVoiceAssistant: () => ({
    cancelListening: jest.fn(),
    forceStopRecognition: jest.fn(),
    microphoneActive: false,
    voiceInputEnabled: false,
  }),
}));

describe('SignInPage', () => {
  const mockOnNavigate = jest.fn();
  const mockShowPrompt = jest.fn();
  const mockLogin = jest.fn();
  const mockSignup = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      signup: mockSignup,
      login: mockLogin,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering and Tab Switching', () => {
    it('should render sign in tab by default', () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      expect(screen.getByRole('tab', { name: /sign in/i, selected: true })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it('should switch to sign up tab when clicked', () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      const signUpTab = screen.getByRole('tab', { name: /create account/i });
      fireEvent.click(signUpTab);

      expect(screen.getByRole('tab', { name: /create account/i, selected: true })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    it('should switch back to sign in tab', () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      const signUpTab = screen.getByRole('tab', { name: /create account/i });
      fireEvent.click(signUpTab);

      const signInTab = screen.getByRole('tab', { name: /^sign in$/i });
      fireEvent.click(signInTab);

      expect(screen.getByRole('tab', { name: /^sign in$/i, selected: true })).toBeInTheDocument();
    });
  });

  describe('Sign In Form', () => {
    it('should handle sign in with valid credentials', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { name: 'Test User' },
      });

      render(<SignInPage onNavigate={mockOnNavigate} showPrompt={mockShowPrompt} />);

      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      fireEvent.change(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(mockShowPrompt).toHaveBeenCalledWith('Welcome Back, Test User!', 'success');
      });

      // Should navigate after delay
      await waitFor(() => {
        expect(mockOnNavigate).toHaveBeenCalledWith('/browse');
      }, { timeout: 1500 });
    });

    it('should show error for invalid email', async () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      fireEvent.change(emailInput, {
        target: { value: 'invalid-email' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should show error for short password', async () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      fireEvent.change(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'short' },
      });

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should handle sign in failure', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
      });

      render(<SignInPage onNavigate={mockOnNavigate} showPrompt={mockShowPrompt} />);

      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      fireEvent.change(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'wrongpassword' },
      });

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowPrompt).toHaveBeenCalledWith(
          'Incorrect email or password. Please try again.',
          'error'
        );
      });

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should handle sign in error', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'));

      render(<SignInPage onNavigate={mockOnNavigate} showPrompt={mockShowPrompt} />);

      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      fireEvent.change(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowPrompt).toHaveBeenCalledWith(
          'Incorrect email or password. Please try again.',
          'error'
        );
      });
    });

    it('should clear form after failed login', async () => {
      mockLogin.mockResolvedValue({
        success: false,
      });

      render(<SignInPage onNavigate={mockOnNavigate} />);

      const emailInput = screen.getByPlaceholderText(/you@example.com/i) as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText(/enter your password/i) as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(emailInput.value).toBe('');
        expect(passwordInput.value).toBe('');
      });
    });
  });

  describe('Sign Up Form', () => {
    beforeEach(() => {
      render(<SignInPage onNavigate={mockOnNavigate} showPrompt={mockShowPrompt} />);
      fireEvent.click(screen.getByRole('tab', { name: /create account/i }));
    });

    it('should handle sign up with valid data', async () => {
      mockSignup.mockResolvedValue({
        success: true,
        user: { name: 'New User' },
      });

      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a password/i);
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i);

      fireEvent.change(nameInput, {
        target: { value: 'New User' },
      });
      fireEvent.change(emailInput, {
        target: { value: 'newuser@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });
      fireEvent.change(confirmInput, {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith({
          fullName: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });
      });

      await waitFor(() => {
        expect(mockShowPrompt).toHaveBeenCalledWith('Welcome to Accessible Games Platform, New User!', 'success');
      });
    });

    it('should show error for missing full name', async () => {
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a password/i);
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i);

      fireEvent.change(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });
      fireEvent.change(confirmInput, {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
      });

      expect(mockSignup).not.toHaveBeenCalled();
    });

    it('should show error for invalid email', async () => {
      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a password/i);
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i);

      fireEvent.change(nameInput, {
        target: { value: 'Test User' },
      });
      fireEvent.change(emailInput, {
        target: { value: 'invalid-email' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });
      fireEvent.change(confirmInput, {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error for password without number', async () => {
      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a password/i);
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i);

      fireEvent.change(nameInput, {
        target: { value: 'Test User' },
      });
      fireEvent.change(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'passwordonly' },
      });
      fireEvent.change(confirmInput, {
        target: { value: 'passwordonly' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must include at least one number/i)).toBeInTheDocument();
      });
    });

    it('should show error for mismatched passwords', async () => {
      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a password/i);
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i);

      fireEvent.change(nameInput, {
        target: { value: 'Test User' },
      });
      fireEvent.change(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });
      fireEvent.change(confirmInput, {
        target: { value: 'different123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should handle signup failure', async () => {
      mockSignup.mockResolvedValue({
        success: false,
        message: 'An account with this email already exists',
      });

      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a password/i);
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i);

      fireEvent.change(nameInput, {
        target: { value: 'Test User' },
      });
      fireEvent.change(emailInput, {
        target: { value: 'existing@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });
      fireEvent.change(confirmInput, {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockShowPrompt).toHaveBeenCalledWith('An account with this email already exists', 'error');
      });
    });

    it('should handle signup error', async () => {
      mockSignup.mockRejectedValue(new Error('Network error'));

      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a password/i);
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i);

      fireEvent.change(nameInput, {
        target: { value: 'Test User' },
      });
      fireEvent.change(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });
      fireEvent.change(confirmInput, {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockShowPrompt).toHaveBeenCalled();
      });
    });
  });


  describe('Form Input Changes', () => {
    it('should update login form inputs', () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      const emailInput = screen.getByPlaceholderText(/you@example.com/i) as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText(/enter your password/i) as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'testpass123' } });

      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('testpass123');
    });

    it('should update signup form inputs', () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      fireEvent.click(screen.getByRole('tab', { name: /create account/i }));

      const nameInput = screen.getByPlaceholderText(/enter your full name/i) as HTMLInputElement;
      const emailInput = screen.getByPlaceholderText(/you@example.com/i) as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

      expect(nameInput.value).toBe('John Doe');
      expect(emailInput.value).toBe('john@example.com');
    });
  });

  describe('Navigation without showPrompt', () => {
    it('should handle successful login without showPrompt callback', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { name: 'Test User' },
      });

      render(<SignInPage onNavigate={mockOnNavigate} />);

      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      fireEvent.change(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnNavigate).toHaveBeenCalledWith('/browse');
      }, { timeout: 1500 });
    });

    it('should handle successful signup without showPrompt callback', async () => {
      mockSignup.mockResolvedValue({
        success: true,
        user: { name: 'New User' },
      });

      render(<SignInPage onNavigate={mockOnNavigate} />);

      fireEvent.click(screen.getByRole('tab', { name: /create account/i }));

      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a password/i);
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i);

      fireEvent.change(nameInput, {
        target: { value: 'New User' },
      });
      fireEvent.change(emailInput, {
        target: { value: 'new@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });
      fireEvent.change(confirmInput, {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockOnNavigate).toHaveBeenCalledWith('/browse');
      }, { timeout: 1500 });
    });
  });

  describe('Validation Edge Cases', () => {
    it('should validate empty email in sign in', async () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should validate whitespace-only full name in sign up', async () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      fireEvent.click(screen.getByRole('tab', { name: /create account/i }));

      const nameInput = screen.getByPlaceholderText(/enter your full name/i);
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/create a password/i);
      const confirmInput = screen.getByPlaceholderText(/confirm your password/i);

      fireEvent.change(nameInput, {
        target: { value: '   ' },
      });
      fireEvent.change(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });
      fireEvent.change(confirmInput, {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(() => {
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    it('should show forgot password link', () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      const forgotPasswordLink = screen.getByText(/forgot password/i);
      expect(forgotPasswordLink).toBeInTheDocument();
    });

    it('should open password reset flow when forgot password is clicked', () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      const forgotPasswordLink = screen.getByText(/forgot password/i);
      fireEvent.click(forgotPasswordLink);

      expect(screen.getByText(/enter the email address associated/i)).toBeInTheDocument();
    });

    it('should handle password reset request', async () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      const forgotPasswordLink = screen.getByText(/forgot password/i);
      fireEvent.click(forgotPasswordLink);

      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const sendButton = screen.getByRole('button', { name: /send reset link/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(apiHelper.apiPost).toHaveBeenCalledWith('/api/auth/request-password-reset', {
          email: 'test@example.com',
        });
      });
    });

    it('should handle password reset request failure', async () => {
      (apiHelper.apiPost as jest.Mock).mockResolvedValue({
        ok: false,
      });

      render(<SignInPage onNavigate={mockOnNavigate} />);

      const forgotPasswordLink = screen.getByText(/forgot password/i);
      fireEvent.click(forgotPasswordLink);

      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const sendButton = screen.getByRole('button', { name: /send reset link/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to send reset email/i)).toBeInTheDocument();
      });
    });

    it('should handle password reset request error', async () => {
      (apiHelper.apiPost as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<SignInPage onNavigate={mockOnNavigate} />);

      const forgotPasswordLink = screen.getByText(/forgot password/i);
      fireEvent.click(forgotPasswordLink);

      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const sendButton = screen.getByRole('button', { name: /send reset link/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to send reset email/i)).toBeInTheDocument();
      });
    });

    it('should show check email step after successful reset request', async () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      const forgotPasswordLink = screen.getByText(/forgot password/i);
      fireEvent.click(forgotPasswordLink);

      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const sendButton = screen.getByRole('button', { name: /send reset link/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });


    it('should close password reset flow', () => {
      render(<SignInPage onNavigate={mockOnNavigate} />);

      const forgotPasswordLink = screen.getByText(/forgot password/i);
      fireEvent.click(forgotPasswordLink);

      expect(screen.getByText(/enter the email address associated/i)).toBeInTheDocument();

      const backButton = screen.getByText(/back to sign in/i);
      fireEvent.click(backButton);

      expect(screen.queryByText(/enter the email address associated/i)).not.toBeInTheDocument();
    });
  });
});
