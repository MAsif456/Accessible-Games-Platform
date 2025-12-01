/**
 * Page for changing user email and password with comprehensive validation.
 *
 * @module ChangeEmailPasswordPage
 * @description
 * Dedicated page for updating email and password from the My Profile page.
 * Implements validation rules and provides clear user feedback.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

/**
 * Props for the ChangeEmailPasswordPage component.
 * @interface ChangeEmailPasswordPageProps
 * @property {function} onNavigate - Navigation callback
 */
interface ChangeEmailPasswordPageProps {
  onNavigate: (path: string) => void;
}

/**
 * Email and password change page component.
 *
 * @component
 * @param {ChangeEmailPasswordPageProps} props - Component props
 * @returns {JSX.Element} The change credentials page
 *
 * @description
 * Provides separate forms for changing email and password with validation.
 *
 * **Email Change Validation:**
 * - Must be valid email format
 * - Must be different from current email
 * - Must not be already in use by another account
 *
 * **Password Change Validation:**
 * - Requires current password verification
 * - New password must be at least 8 characters
 * - New password must contain at least one number
 * - New password and confirmation must match
 *
 * **State Management:**
 * - Separate state for email and password forms
 * - Error and success messages for each form
 * - Updates AuthContext on successful email change
 *
 * **API Interactions:**
 * - authService.updateAccount() for both operations
 * - CSRF protected via apiPut helper
 *
 * @example
 * <ChangeEmailPasswordPage onNavigate={navigate} />
 */
const ChangeEmailPasswordPage: React.FC<ChangeEmailPasswordPageProps> = ({ onNavigate }) => {
  const { user, updateUser } = useAuth();

  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const passwordHasNumber = (value: string) => /\d/.test(value);

  const validatePassword = () => {
    if (newPassword.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (!passwordHasNumber(newPassword)) {
      return 'Password must include at least one number.';
    }
    if (newPassword !== confirmPassword) {
      return 'New password and confirm password must match.';
    }
    return null;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage(null);
    setEmailError(null);

    const trimmedEmail = newEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    if (trimmedEmail === user?.email) {
      setEmailError('New email address must be different from your current email.');
      return;
    }

    try {
      const response = await authService.updateAccount({ newEmail: trimmedEmail });
      if (response.success && response.user) {
        updateUser(response.user as any);
        setEmailMessage('Email address updated successfully.');
      } else if (response.message && response.message.toLowerCase().includes('already in use')) {
        setEmailError('This email address is already in use.');
      } else if (response.message) {
        setEmailError(response.message);
      } else {
        setEmailError('Unable to update email address. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Unable to update email address. Please try again.';
      if (msg.toLowerCase().includes('already in use')) {
        setEmailError('This email address is already in use.');
      } else {
        setEmailError(msg);
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    const basicError = validatePassword();
    if (basicError) {
      setPasswordError(basicError);
      return;
    }

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    try {
      const response = await authService.updateAccount({
        currentPassword,
        newPassword,
      });
      if (response.success) {
        setPasswordError(null);
        setPasswordMessage('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else if (response.message) {
        setPasswordError(response.message);
      } else {
        setPasswordError('Unable to change password. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Unable to change password. Please try again.';
      setPasswordError(msg);
    }
  };

  return (
    <main className="change-credentials-page" aria-label="Change Email and Password page">
      <section className="profile-header">
        <button
          type="button"
          className="link-button back-link back-link--profile"
          onClick={() => onNavigate('/my-profile')}
        >
          Back to Profile
        </button>
        <h1 className="profile-title">Change Email &amp; Password</h1>
        <p className="profile-subtitle">Update your login credentials</p>
      </section>

      <section className="change-credentials-layout">
        {/* Change Email Card */}
        <section className="profile-card" aria-label="Change email address">
          <h2 className="profile-card-title">Change Email Address</h2>
          <p className="profile-card-description">
            Update the email address associated with your account.
          </p>
          <form onSubmit={handleEmailSubmit} className="profile-form" noValidate>
            <div className="form-group">
              <label htmlFor="new-email" className="form-label">
                New Email Address
              </label>
              <input
                id="new-email"
                type="email"
                className="form-input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            {emailError && (
              <p className="form-error" role="alert">{emailError}</p>
            )}
            {emailMessage && !emailError && (
              <p className="form-success" role="status">{emailMessage}</p>
            )}
            <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }}>
              Update Email Address
            </button>
          </form>
        </section>

        {/* Change Password Card */}
        <section className="profile-card" aria-label="Change password">
          <h2 className="profile-card-title">Change Password</h2>
          <p className="profile-card-description">
            Choose a strong password to keep your account secure.
          </p>
          <form onSubmit={handlePasswordSubmit} className="profile-form" noValidate>
            <div className="form-group">
              <label htmlFor="current-password" className="form-label">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                className="form-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password" className="form-label">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-describedby="password-help"
              />
              <p id="password-help" className="form-hint">
                Password must be at least 8 characters and include at least one number.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password" className="form-label">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {passwordError && (
              <p className="form-error" role="alert">{passwordError}</p>
            )}
            {passwordMessage && !passwordError && (
              <p className="form-success" role="status">{passwordMessage}</p>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }}>
              Change Password
            </button>
          </form>
        </section>
      </section>
    </main>
  );
};

export default ChangeEmailPasswordPage;
