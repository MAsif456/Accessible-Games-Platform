// SignInPage.tsx
// Handles all user authentication flows: sign in, create account, and password reset.
// Accessibility and usability are prioritised, with clear error messages, keyboard navigation, and ARIA attributes.
// Password reset uses a one-time code sent by email, supporting both security and users with assistive technology.
// All validation logic is client-side for immediate feedback, but server-side validation is also enforced for security.

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/SignIn.css';

interface SignInPageProps {
  onNavigate: (path: string) => void;
  showPrompt?: (message: string, type?: 'success' | 'error') => void;
}

type TabType = 'signin' | 'signup';

const SignInPage: React.FC<SignInPageProps> = ({ onNavigate, showPrompt }) => {
  const { signup, login } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'enter' | 'check' | 'reset' | 'complete'>('enter');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetTimer, setResetTimer] = useState(60);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetResent, setResetResent] = useState(false);

  // Sign In form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  // Sign Up form state
  const [signupData, setSignupData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Password visibility state
  const [showPassword, setShowPassword] = useState({
    login: false,
    signup: false,
    confirm: false,
  });

  // Validation state
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  const [signupErrors, setSignupErrors] = useState<{ fullName?: string; email?: string; password?: string; confirmPassword?: string }>({});

  // Email regex for validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Enhanced password validation for signup
  const passwordHasNumber = (password: string) => /\d/.test(password);

  // Validate Sign In form
  const validateLogin = () => {
    const errors: { email?: string; password?: string } = {};
    if (!emailRegex.test(loginData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!loginData.password || loginData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate Sign Up form
  const validateSignup = () => {
    const errors: { fullName?: string; email?: string; password?: string; confirmPassword?: string } = {};
    if (!signupData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    if (!emailRegex.test(signupData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!signupData.password || signupData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!passwordHasNumber(signupData.password)) {
      errors.password = 'Password must include at least one number';
    }
    if (signupData.password !== signupData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setSignupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);
    setLoginErrors({});
    if (!validateLogin()) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await login(loginData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Login successful!' });
        if (showPrompt) {
          // Use user's name if available, fallback to generic
          const name = response.user?.name || '';
          showPrompt(
            name ? `Welcome Back, ${name}!` : 'Welcome Back!',
            'success'
          );
        }
        // Redirect to browse page after short delay
        setTimeout(() => {
          onNavigate('/browse');
        }, 1000);
      } else {
        // Show prompt for invalid credentials or email
        if (showPrompt) {
          showPrompt('Incorrect email or password. Please try again.', 'error');
        }
        setLoginData({ email: '', password: '' });
      }
    } catch (error: any) {
      if (showPrompt) {
        showPrompt('Incorrect email or password. Please try again.', 'error');
      }
      setLoginData({ email: '', password: '' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);
    setSignupErrors({});
    if (!validateSignup()) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await signup(signupData);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Account created successfully!' });
        setSignupData({ fullName: '', email: '', password: '', confirmPassword: '' }); // Clear fields
        if (showPrompt) {
          showPrompt(`Welcome to Accessible Games Platform, ${signupData.fullName}!`, 'success');
        }
        // Redirect to browse page after short delay
        setTimeout(() => {
          onNavigate('/browse');
        }, 1000);
      } else {
        // Show prompt for duplicate email
        if (response.message && response.message.includes('already exists') && showPrompt) {
          showPrompt('An account with this email already exists', 'error');
        } else if (showPrompt) {
          showPrompt(response.message || 'Signup failed', 'error');
        }
      }
    } catch (error: any) {
      if (showPrompt) {
        showPrompt('Signup failed. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset request
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (res.ok) {
        setResetStep('check');
        setResetTimer(60);
        setResetResent(false);
      } else {
        setResetError('Failed to send reset email.');
      }
    } catch {
      setResetError('Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  // Timer for resend link
  React.useEffect(() => {
    if (resetStep === 'check' && resetTimer > 0) {
      const t = setTimeout(() => setResetTimer(resetTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resetStep, resetTimer]);

  // Handle resend
  const handleResend = async () => {
    setResetResent(false);
    setResetLoading(true);
    setResetError('');
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (res.ok) {
        setResetResent(true);
        setResetTimer(60);
      } else {
        setResetError('Failed to resend email.');
      }
    } catch {
      setResetError('Failed to resend email.');
    } finally {
      setResetLoading(false);
    }
  };

  // Handle code and new password submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword: resetNewPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setResetStep('complete');
      } else {
        setResetError(data.message || 'Failed to reset password.');
      }
    } catch {
      setResetError('Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="signin-page">
      {/* Removed inner card to match grey background aesthetic */}
      <div className="signin-container">
        {/* Header and tabs now sit directly in the container */}
        <div className="signin-header">
          <h1 className="signin-title">
            Sign in to your account or create a new one to access all features
          </h1>
        </div>

        <div className="signin-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'signin'}
            aria-controls="signin-panel"
            className={`signin-tab ${activeTab === 'signin' ? 'signin-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('signin');
              setMessage(null);
              // Hide any password reset UI when returning to Sign In
              setShowResetPassword(false);
              setResetStep('enter');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'signup'}
            aria-controls="signup-panel"
            className={`signin-tab ${activeTab === 'signup' ? 'signin-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('signup');
              setMessage(null);
              // Hide any password reset UI when switching to Create Account
              setShowResetPassword(false);
              setResetStep('enter');
            }}
          >
            Create Account
          </button>
        </div>

        {message && (
          <div className={`signin-message signin-message--${message.type}`} role="alert">
            {message.text}
          </div>
        )}

        {/* Sign In Form */}
        {!showResetPassword && activeTab === 'signin' && (
          <div
            id="signin-panel"
            role="tabpanel"
            aria-labelledby="signin-tab"
            className="signin-form-container"
          >
            <form onSubmit={handleSignIn} className="signin-form" noValidate>
              <div className="form-group">
                <label htmlFor="signin-email" className="form-label">
                  Email address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="signin-email"
                  className={`form-input${loginErrors.email ? ' form-input--error' : ''}`}
                  placeholder="you@example.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  aria-required="true"
                  aria-invalid={!!loginErrors.email}
                />
                {loginErrors.email && (
                  <div className="form-error" style={{ color: '#dc2626', fontSize: '0.95rem', marginTop: 4 }}>
                    <span style={{ fontSize: '1.1em', marginRight: 4 }}>❗</span>{loginErrors.email}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="signin-password" className="form-label">
                  Password <span className="required">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword.login ? 'text' : 'password'}
                    id="signin-password"
                    className={`form-input${loginErrors.password ? ' form-input--error' : ''}`}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    aria-required="true"
                    aria-invalid={!!loginErrors.password}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword({ ...showPassword, login: !showPassword.login })}
                    aria-label={showPassword.login ? 'Hide password' : 'Show password'}
                  >
                    👁 {showPassword.login ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="form-hint">Must be at least 8 characters</p>
                {loginErrors.password && (
                  <div className="form-error" style={{ color: '#dc2626', fontSize: '0.95rem', marginTop: 4 }}>
                    <span style={{ fontSize: '1.1em', marginRight: 4 }}>❗</span>{loginErrors.password}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="forgot-password"
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}
                  onClick={() => setShowResetPassword(true)}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="accessible-signin-section">
                <h3 className="accessible-signin-title">Accessible Sign In Options</h3>
                
                <button
                  type="button"
                  className="accessible-signin-button"
                  onClick={() => alert('Voice sign-in feature coming soon')}
                >
                  <span className="accessible-signin-icon" aria-hidden="true">🎤</span>
                  <span>Sign in with Voice</span>
                </button>

                <div className="keyboard-navigation-info">
                  <span className="keyboard-icon" aria-hidden="true">⌨️</span>
                  <div className="keyboard-text">
                    <strong>Keyboard Navigation:</strong>
                    <p>Press Tab to move between fields and Enter to sign in. All interactive elements are keyboard accessible.</p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {showResetPassword && (
          <div className="signin-form-container" style={{ maxWidth: 600, margin: '0 auto' }}>
            {/* Stepper */}
            <div style={{ color: '#2563eb', fontWeight: 500, marginBottom: 24, fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              <span style={{ color: resetStep === 'enter' ? '#2563eb' : '#444' }}>Enter Email</span>
              <span style={{ margin: '0 12px', color: '#888' }}>&gt;</span>
              <span style={{ color: resetStep === 'check' ? '#2563eb' : '#444' }}>Check Email</span>
              <span style={{ margin: '0 12px', color: '#888' }}>&gt;</span>
              <span style={{ color: resetStep === 'reset' ? '#2563eb' : '#444' }}>Reset Password</span>
              <span style={{ margin: '0 12px', color: '#888' }}>&gt;</span>
              <span style={{ color: resetStep === 'complete' ? '#2563eb' : '#444' }}>Complete</span>
            </div>
            {/* Step: Enter Email */}
            {resetStep === 'enter' && (
              <>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginBottom: 16, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setShowResetPassword(false)}
                >
                  <span style={{ fontSize: '1.2em' }}>&larr;</span> Back to Sign In
                </button>
                <h2 style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 8 }}>Reset your password</h2>
                <p style={{ color: '#444', marginBottom: 24 }}>
                  Enter the email address associated with your account and we'll send you a link to reset your password.
                </p>
                <form className="signin-form" onSubmit={handleRequestReset}>
                  <div className="form-group">
                    <label htmlFor="reset-email" className="form-label">
                      Email address <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      id="reset-email"
                      className="form-input"
                      placeholder="you@example.com"
                      required
                      aria-required="true"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                    />
                    <p className="form-hint">We'll send a password reset link to this email address</p>
                  </div>
                  {resetError && <div className="form-error" style={{ color: '#dc2626', marginBottom: 8 }}>{resetError}</div>}
                  <button
                    type="submit"
                    className="submit-button"
                    style={{ marginTop: 16 }}
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
                <div style={{ marginTop: 32, textAlign: 'center', color: '#444' }}>
                  Remember your password?{' '}
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: '1rem' }}
                    onClick={() => setShowResetPassword(false)}
                  >
                    Sign in
                  </button>
                </div>
              </>
            )}
            {/* Step: Check Email */}
            {resetStep === 'check' && (
              <>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginBottom: 16, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setResetStep('enter')}
                >
                  <span style={{ fontSize: '1.2em' }}>&larr;</span> Back to Enter Email
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                  <div style={{ background: '#e0e7ff', borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: '2.5rem', color: '#2563eb' }}>✉️</span>
                  </div>
                  <h2 style={{ fontWeight: 600, fontSize: '1.15rem', marginBottom: 8 }}>Check your email</h2>
                  <p style={{ color: '#444', marginBottom: 24, textAlign: 'center' }}>
                    We've sent a password reset link to <b>{resetEmail}</b>. If it doesn't appear in a few minutes, check your spam folder.
                  </p>
                  <button
                    type="button"
                    className="submit-button"
                    style={{ width: 220, marginBottom: 24 }}
                    onClick={() => { setShowResetPassword(false); setResetStep('enter'); }}
                  >
                    Return to Sign In
                  </button>
                </div>
                <hr style={{ margin: '32px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                <div style={{ textAlign: 'center', color: '#444' }}>
                  Didn't receive the email?
                  <br />
                  <button
                    type="button"
                    className="submit-button"
                    style={{ marginTop: 12, marginBottom: 8, background: '#fff', color: '#2563eb', border: '1.5px solid #2563eb', fontWeight: 500, opacity: resetTimer > 0 ? 0.6 : 1, cursor: resetTimer > 0 ? 'not-allowed' : 'pointer' }}
                    onClick={handleResend}
                    disabled={resetTimer > 0 || resetLoading}
                  >
                    Resend link {resetTimer > 0 ? `(${resetTimer}s)` : ''}
                  </button>
                  <div style={{ fontSize: '0.95rem', color: '#888' }}>
                    Please wait {resetTimer}s before requesting a new link
                  </div>
                  {resetResent && <div style={{ color: '#22c55e', marginTop: 8 }}>A new reset link has been sent.</div>}
                </div>
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: '1rem' }}
                    onClick={() => setResetStep('reset')}
                  >
                    Already have a code? Reset Password
                  </button>
                </div>
              </>
            )}
            {/* Step: Reset Password */}
            {resetStep === 'reset' && (
              <>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginBottom: 16, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setResetStep('check')}
                >
                  <span style={{ fontSize: '1.2em' }}>&larr;</span> Back to Check Email
                </button>
                <h2 style={{ fontWeight: 600, fontSize: '1.15rem', marginBottom: 8 }}>Reset your password</h2>
                <form className="signin-form" onSubmit={handleResetPassword}>
                  <div className="form-group">
                    <label htmlFor="reset-code" className="form-label">
                      One-time code <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="reset-code"
                      className="form-input"
                      placeholder="Enter the 6-digit code"
                      required
                      aria-required="true"
                      value={resetCode}
                      onChange={e => setResetCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reset-new-password" className="form-label">
                      New password <span className="required">*</span>
                    </label>
                    <input
                      type="password"
                      id="reset-new-password"
                      className="form-input"
                      placeholder="Enter your new password"
                      required
                      aria-required="true"
                      value={resetNewPassword}
                      onChange={e => setResetNewPassword(e.target.value)}
                    />
                    <p className="form-hint">Must be at least 8 characters and include a number</p>
                  </div>
                  {resetError && <div className="form-error" style={{ color: '#dc2626', marginBottom: 8 }}>{resetError}</div>}
                  <button
                    type="submit"
                    className="submit-button"
                    style={{ marginTop: 16 }}
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </>
            )}
            {/* Step: Complete */}
            {resetStep === 'complete' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                  <div style={{ background: '#e0e7ff', borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: '2.5rem', color: '#2563eb' }}>✅</span>
                  </div>
                  <h2 style={{ fontWeight: 600, fontSize: '1.15rem', marginBottom: 8 }}>Password reset complete</h2>
                  <p style={{ color: '#444', marginBottom: 24, textAlign: 'center' }}>
                    Your password has been reset. You can now sign in with your new password.
                  </p>
                  <button
                    type="button"
                    className="submit-button"
                    style={{ width: 220, marginBottom: 24 }}
                    onClick={() => { setShowResetPassword(false); setResetStep('enter'); }}
                  >
                    Return to Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Sign Up Form */}
        {activeTab === 'signup' && (
          <div
            id="signup-panel"
            role="tabpanel"
            aria-labelledby="signup-tab"
            className="signin-form-container"
          >
            <form onSubmit={handleSignUp} className="signin-form" noValidate>
              <h2 className="form-section-title" style={{ marginBottom: '1.5rem' }}>Create Account</h2>
              <div className="form-group">
                <label htmlFor="signup-fullname" className="form-label">
                  Full Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="signup-fullname"
                  className={`form-input${signupErrors.fullName ? ' form-input--error' : ''}`}
                  placeholder="Enter your full name"
                  value={signupData.fullName}
                  onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                  required
                  aria-required="true"
                  aria-invalid={!!signupErrors.fullName}
                />
                {signupErrors.fullName && (
                  <div className="form-error" style={{ color: '#dc2626', fontSize: '0.95rem', marginTop: 4 }}>
                    <span style={{ fontSize: '1.1em', marginRight: 4 }}>❗</span>{signupErrors.fullName}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="signup-email" className="form-label">
                  Email address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="signup-email"
                  className={`form-input${signupErrors.email ? ' form-input--error' : ''}`}
                  placeholder="you@example.com"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  required
                  aria-required="true"
                  aria-invalid={!!signupErrors.email}
                />
                {signupErrors.email && (
                  <div className="form-error" style={{ color: '#dc2626', fontSize: '0.95rem', marginTop: 4 }}>
                    <span style={{ fontSize: '1.1em', marginRight: 4 }}>❗</span>{signupErrors.email}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="signup-password" className="form-label">
                  Password <span className="required">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword.signup ? 'text' : 'password'}
                    id="signup-password"
                    className={`form-input${signupErrors.password ? ' form-input--error' : ''}`}
                    placeholder="Create a password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    required
                    aria-required="true"
                    aria-invalid={!!signupErrors.password}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword({ ...showPassword, signup: !showPassword.signup })}
                    aria-label={showPassword.signup ? 'Hide password' : 'Show password'}
                  >
                    👁 {showPassword.signup ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="form-hint">Must be at least 8 characters and include at least one number</p>
                {signupErrors.password && (
                  <div className="form-error" style={{ color: '#dc2626', fontSize: '0.95rem', marginTop: 4 }}>
                    <span style={{ fontSize: '1.1em', marginRight: 4 }}>❗</span>{signupErrors.password}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="signup-confirm-password" className="form-label">
                  Confirm Password <span className="required">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    id="signup-confirm-password"
                    className={`form-input${signupErrors.confirmPassword ? ' form-input--error' : ''}`}
                    placeholder="Confirm your password"
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    required
                    aria-required="true"
                    aria-invalid={!!signupErrors.confirmPassword}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    aria-label={showPassword.confirm ? 'Hide password' : 'Show password'}
                  >
                    👁 {showPassword.confirm ? 'Hide' : 'Show'}
                  </button>
                </div>
                {signupErrors.confirmPassword && (
                  <div className="form-error" style={{ color: '#dc2626', fontSize: '0.95rem', marginTop: 4 }}>
                    <span style={{ fontSize: '1.1em', marginRight: 4 }}>❗</span>{signupErrors.confirmPassword}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div className="accessible-signin-section">
                <h3 className="accessible-signin-title">Accessible Sign In Options</h3>
                <button
                  type="button"
                  className="accessible-signin-button"
                  onClick={() => alert('Voice sign-up feature coming soon')}
                >
                  <span className="accessible-signin-icon" aria-hidden="true">🎤</span>
                  <span>Sign up with Voice</span>
                </button>
                <div className="keyboard-navigation-info">
                  <span className="keyboard-icon" aria-hidden="true">⌨️</span>
                  <div className="keyboard-text">
                    <strong>Keyboard Navigation:</strong>
                    <p>Press Tab to move between fields and Enter to create your account. All interactive elements are keyboard accessible.</p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignInPage;