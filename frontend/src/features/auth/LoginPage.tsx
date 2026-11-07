import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { ROLES, DEMO_CREDENTIALS } from './types';
import { ThemeToggle } from '../../components/ThemeToggle';
import './LoginPage.css';

interface LoginPageProps {
  onSuccess: () => void;
}

type AuthMode = 'signin' | 'signup';

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, signup } = useAuth();
  const initialMode: AuthMode =
    typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('auth') === 'signup'
      ? 'signup'
      : 'signin';
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Sign In inputs (empty by default, no auto-fill)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up inputs
  const [fullName, setFullName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupRole, setSignupRole] = useState('ops');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoHelp, setShowDemoHelp] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your username or position identifier.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!signupUsername.trim() || signupUsername.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (!signupPassword || signupPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    const result = await signup(signupUsername, signupPassword, fullName, signupRole);
    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="login-screen">
      {/* Top Header Bar */}
      <header className="login-top-bar">
        <div className="login-logo-brand">
          <img
            src="/assets/logo/emblem_icon.png"
            alt="LedgerFlow Emblem"
            className="login-emblem-img"
          />
          <div>
            <div className="login-brand-title">LedgerFlow</div>
            <div className="login-brand-subtitle">Financial Observability Platform</div>
          </div>
        </div>
        <div className="login-top-actions">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="login-container">
        <div className="login-card">
          {/* Card Header */}
          <div className="login-card-header">
            <div className="login-emblem-badge">
              <img
                src="/assets/logo/emblem_icon.png"
                alt="LedgerFlow Emblem"
                className="login-emblem-large"
              />
            </div>
            <h1 className="login-heading">Enterprise Financial Gateway</h1>
          </div>

          {/* Mode Switcher: Sign In vs Sign Up */}
          <div className="auth-mode-toggle" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={`mode-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setMode('signin');
                setError('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`mode-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setMode('signup');
                setError('');
              }}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="login-error-alert" role="alert">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <form className="login-form" onSubmit={handleSignIn} noValidate>
              <div className="form-group">
                <label htmlFor="signin-username">USERNAME / USER ID</label>
                <div className="input-wrap">
                  <input
                    id="signin-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your registered username (e.g. admin, cfo)"
                    autoComplete="username"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="signin-password">PASSWORD</label>
                </div>
                <div className="input-wrap">
                  <input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="login-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Authenticating...' : 'Sign In'}
                </button>
              </div>

              {/* Collapsible Reference Credentials Helper */}
              <div className="demo-credentials-drawer">
                <button
                  type="button"
                  className="demo-credentials-toggle"
                  onClick={() => setShowDemoHelp((prev) => !prev)}
                >
                  <span>{showDemoHelp ? '▾ Hide Built-In Seed Accounts' : '▸ View Built-In Seed Accounts'}</span>
                  <span className="demo-badge">Verified DB</span>
                </button>

                {showDemoHelp && (
                  <div className="demo-credentials-list">
                    <p className="demo-hint">
                      The database is pre-seeded with these role credentials. Click any username to copy into the field:
                    </p>
                    <div className="demo-chips">
                      {DEMO_CREDENTIALS.map((cred) => (
                        <button
                          key={cred.roleId}
                          type="button"
                          className="demo-chip"
                          onClick={() => {
                            setUsername(cred.username);
                            setPassword(cred.password);
                            setError('');
                          }}
                        >
                          <span className="chip-role">{cred.label}</span>
                          <span className="chip-creds">
                            user: <strong>{cred.username}</strong> • pass: <strong>{cred.password}</strong>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form className="login-form" onSubmit={handleSignUp} noValidate>
              <div className="form-group">
                <label htmlFor="signup-fullname">FULL NAME</label>
                <div className="input-wrap">
                  <input
                    id="signup-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Chen, Marcus Vance"
                    autoComplete="name"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="signup-username">DESIRED USERNAME / ID</label>
                <div className="input-wrap">
                  <input
                    id="signup-username"
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="e.g. sarah_exec, finance_lead (min 3 chars)"
                    autoComplete="username"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="form-group">
                <label>ORGANIZATIONAL ROLE & ACCESS LEVEL</label>
                <div className="signup-roles-grid">
                  {Object.values(ROLES).map((role) => {
                    const isSelected = signupRole === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        className={`role-option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSignupRole(role.id)}
                      >
                        <div className="role-option-top">
                          <span className="role-option-title">{role.title}</span>
                          <span
                            className="role-option-badge"
                            style={{
                              color: role.badgeColor,
                              borderColor: `${role.badgeColor}40`,
                              backgroundColor: `${role.badgeColor}15`,
                            }}
                          >
                            {role.badge}
                          </span>
                        </div>
                        <div className="role-option-scope">
                          {role.id === 'admin'
                            ? 'Unrestricted (All 6 Pages)'
                            : `${role.allowedTabs.length} of 6 Modules Accessible`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label htmlFor="signup-password">PASSWORD</label>
                  <div className="input-wrap">
                    <input
                      id="signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min. 4 characters"
                      autoComplete="new-password"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-password">CONFIRM PASSWORD</label>
                  <div className="input-wrap">
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="login-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Registering...' : 'Create Account & Sign In'}
                </button>
              </div>
            </form>
          )}

          {/* Card Footer */}
          <div className="login-footer-info">
            <span className="footer-dot">●</span>
            <span>DuckDB PBKDF2 HMAC-SHA256 Encryption • Enterprise Role-Based Access</span>
          </div>
        </div>
      </main>
    </div>
  );
};
