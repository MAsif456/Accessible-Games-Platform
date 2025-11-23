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

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

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
        setMessage({ type: 'error', text: response.message || 'Login failed' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

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
        setMessage({ type: 'error', text: response.message || 'Signup failed' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-page">
      <div className="signin-container">
        <div className="signin-card">
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
          {activeTab === 'signin' && (
            <div
              id="signin-panel"
              role="tabpanel"
              aria-labelledby="signin-tab"
              className="signin-form-container"
            >
              <form onSubmit={handleSignIn} className="signin-form">
                <div className="form-group">
                  <label htmlFor="signin-email" className="form-label">
                    Email address <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="signin-email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    aria-required="true"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signin-password" className="form-label">
                    Password <span className="required">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword.login ? 'text' : 'password'}
                      id="signin-password"
                      className="form-input"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      aria-required="true"
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
                </div>

                <div className="form-actions">
                  <a href="#" className="forgot-password">
                    Forgot password?
                  </a>
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

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <div
              id="signup-panel"
              role="tabpanel"
              aria-labelledby="signup-tab"
              className="signin-form-container"
            >
              <form onSubmit={handleSignUp} className="signin-form">
                <h2 className="form-section-title" style={{ marginBottom: '1.5rem' }}>Create Account</h2>
                <div className="form-group">
                  <label htmlFor="signup-fullname" className="form-label">
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="signup-fullname"
                    className="form-input"
                    placeholder="Enter your full name"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                    required
                    aria-required="true"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-email" className="form-label">
                    Email address <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="signup-email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    required
                    aria-required="true"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signup-password" className="form-label">
                    Password <span className="required">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword.signup ? 'text' : 'password'}
                      id="signup-password"
                      className="form-input"
                      placeholder="Create a password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                      aria-required="true"
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
                  <p className="form-hint">Must be at least 8 characters</p>
                </div>

                <div className="form-group">
                  <label htmlFor="signup-confirm-password" className="form-label">
                    Confirm Password <span className="required">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      id="signup-confirm-password"
                      className="form-input"
                      placeholder="Confirm your password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                      required
                      aria-required="true"
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
    </div>
  );
};

export default SignInPage;