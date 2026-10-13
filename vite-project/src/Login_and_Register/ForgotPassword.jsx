import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../components/auth.css';
import apiConfig from '../config/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  // resetMode: 'email' (Resend OTP code) or 'security' (Security Question)
  const [resetMode, setResetMode] = useState('email');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'error' | 'warning'
  const [loading, setLoading] = useState(false);

  // Step 1: Send Resend Email verification code
  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const res = await fetch(apiConfig.getUrl('/api/auth/forgot-password/send-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.sent) {
          setMessage(`Verification code has been sent to your email (${email}).`);
          setMessageType('success');
        } else {
          setMessage(data.message || 'Verification code generated.');
          setMessageType('warning');
        }
        // If in dev mode with Resend test restriction and code is provided
        if (data.devCode) {
          setCode(data.devCode);
        }
        setStep(2);
      } else {
        setMessage(data.message || 'Failed to send reset code');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Server error while sending email. Try again.');
      setMessageType('error');
    }
    setLoading(false);
  };

  // Step 2 (Email Mode): Verify code and set new password
  const handleVerifyCodeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiConfig.getUrl('/api/auth/forgot-password/verify-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Password reset successfully! Redirecting to login...');
        setMessageType('success');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setMessage(data.message || 'Failed to reset password');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Server error while resetting password. Try again.');
      setMessageType('error');
    }
    setLoading(false);
  };

  // Legacy Step 1: Get Security Question
  const handleSecurityQuestionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(apiConfig.getUrl('/api/auth/forgot-password/question'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setSecurityQuestion(data.securityQuestion);
        setStep(2);
      } else {
        setMessage(data.message || 'Failed to retrieve security question');
      }
    } catch (err) {
      setMessage('Server error. Try again.');
    }
    setLoading(false);
  };

  // Legacy Step 2: Answer Security Question & Reset
  const handleSecurityAnswerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiConfig.getUrl('/api/auth/forgot-password/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, securityAnswer, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Password reset successfully! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setMessage(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setMessage('Server error. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-header">
        <Link to="/" className="auth-title-link">
          <h1 className="auth-title">DwellSync</h1>
        </Link>
      </div>

      <div className="auth-container">
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ color: '#ffffff', fontSize: '1.6rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
            Reset Password
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            {resetMode === 'email' 
              ? 'Receive a 6-digit verification code to your email' 
              : 'Answer your security question to reset your password'}
          </p>
        </div>

        {/* Mode Toggle Switch */}
        {step === 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(2, 6, 23, 0.5)', padding: '4px', borderRadius: '10px' }}>
            <button
              type="button"
              onClick={() => { setResetMode('email'); setMessage(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: resetMode === 'email' ? '#006aff' : 'transparent',
                color: '#ffffff',
                transition: 'all 0.2s ease'
              }}
            >
              ✉️ Email Code (Resend)
            </button>
            <button
              type="button"
              onClick={() => { setResetMode('security'); setMessage(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: resetMode === 'security' ? '#006aff' : 'transparent',
                color: '#ffffff',
                transition: 'all 0.2s ease'
              }}
            >
              🔒 Security Question
            </button>
          </div>
        )}

        {/* STEP 1: Email Mode */}
        {step === 1 && resetMode === 'email' && (
          <form onSubmit={handleSendCode} className="auth-form">
            <div className="form-group">
              <label>Account Email Address</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Sending code...' : 'Send Verification Code'}
            </button>
            <div className="auth-divider"><span>OR</span></div>
            <button type="button" className="auth-button secondary" onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </form>
        )}

        {/* STEP 2: Email Mode (Code + New Password) */}
        {step === 2 && resetMode === 'email' && (
          <form onSubmit={handleVerifyCodeSubmit} className="auth-form">
            <div className="form-group">
              <label>6-Digit Verification Code</label>
              <input
                type="text"
                name="code"
                maxLength="6"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. 123456"
                style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}
                required
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button
              type="button"
              className="auth-button secondary"
              onClick={() => { setStep(1); setMessage(''); }}
              style={{ marginTop: '0.25rem' }}
            >
              Request New Code
            </button>
          </form>
        )}

        {/* STEP 1: Security Question Mode */}
        {step === 1 && resetMode === 'security' && (
          <form onSubmit={handleSecurityQuestionSubmit} className="auth-form">
            <div className="form-group">
              <label>Account Email</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Finding account...' : 'Get Security Question'}
            </button>
            <div className="auth-divider"><span>OR</span></div>
            <button type="button" className="auth-button secondary" onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </form>
        )}

        {/* STEP 2: Security Question Mode */}
        {step === 2 && resetMode === 'security' && (
          <form onSubmit={handleSecurityAnswerSubmit} className="auth-form">
            <div className="form-group">
              <label>Security Question</label>
              <div style={{ padding: '0.8rem 1rem', background: 'rgba(2, 6, 23, 0.7)', borderRadius: '10px', color: '#f1f5f9', border: '1px solid rgba(255, 255, 255, 0.16)' }}>
                {securityQuestion}
              </div>
            </div>
            <div className="form-group">
              <label>Security Answer</label>
              <input
                type="text"
                name="securityAnswer"
                value={securityAnswer}
                onChange={e => setSecurityAnswer(e.target.value)}
                placeholder="Your security answer"
                required
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <div className="auth-divider"><span>OR</span></div>
            <button type="button" className="auth-button secondary" onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </form>
        )}

        {message && (
          <div className={`message ${messageType === 'success' ? 'success' : messageType === 'warning' ? 'warning' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
