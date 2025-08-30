import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../components/auth.css';
import apiConfig from '../config/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Enter email to get security question
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('http://localhost:5001/api/auth/forgot-password/question', {
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

  // Step 2: Answer security question and set new password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('http://localhost:5001/api/auth/forgot-password/reset', {
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
        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Loading...' : 'Get Security Question'}
            </button>
            <div className="auth-divider"><span>OR</span></div>
            <button type="button" className="auth-button secondary" onClick={() => navigate('/login')}>
              Log In
            </button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleResetSubmit} className="auth-form">
            <div className="form-group">
              <label>Security Question</label>
              <div className="security-question-display">{securityQuestion}</div>
            </div>
            <div className="form-group">
              <label>Security Answer</label>
              <input
                type="text"
                name="securityAnswer"
                value={securityAnswer}
                onChange={e => setSecurityAnswer(e.target.value)}
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
                required
              />
            </div>
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <div className="auth-divider"><span>OR</span></div>
            <button type="button" className="auth-button secondary" onClick={() => navigate('/login')}>
              Log In
            </button>
          </form>
        )}
        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>
        )}
      </div>
    </div>
  );
}
