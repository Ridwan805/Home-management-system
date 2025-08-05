import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../components/auth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: email, 2: security question, 3: new password
  const [formData, setFormData] = useState({
    email: '',
    securityAnswer: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      
      if (res.ok) {
        console.log('Security question retrieved:', data.securityQuestion);
        setSecurityQuestion(data.securityQuestion);
        setStep(2);
        setMessage('');
      } else {
        setMessage(data.message);
        console.error('Error retrieving security question:', data.message);
      }
    } catch (err) {
      setMessage('Error retrieving security question');
      console.error('Network error:', err);
    }
  };

  const handleSecurityAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!formData.securityAnswer.trim()) {
      setMessage('Please provide your security answer');
      return;
    }
    setStep(3);
    setMessage('');
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          securityAnswer: formData.securityAnswer,
          newPassword: formData.newPassword
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage('Error resetting password');
    }
  };

  const renderStep1 = () => (
    <form onSubmit={handleEmailSubmit} className="auth-form">
      <h2>Forgot Password</h2>
      <p>Enter your email address to retrieve your security question.</p>
      
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
        />
      </div>

      <button type="submit" className="auth-button">Continue</button>
      
      <div className="auth-divider">
        <span>OR</span>
      </div>
      
      <button
        type="button"
        className="auth-button secondary"
        onClick={() => navigate('/login')}
      >
        Back to Login
      </button>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleSecurityAnswerSubmit} className="auth-form">
      <h2>Security Question</h2>
      <p>Please answer your security question to reset your password.</p>
      
      <div className="form-group">
        <label>Security Question</label>
        <div className="security-question-display">
          {securityQuestion ? (
            securityQuestion
          ) : (
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
              Loading security question...
            </span>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Your Answer</label>
        <input
          type="text"
          name="securityAnswer"
          value={formData.securityAnswer}
          onChange={handleChange}
          placeholder="Enter your answer"
          required
        />
      </div>

      <button type="submit" className="auth-button">Verify Answer</button>
      
      <button
        type="button"
        className="auth-button secondary"
        onClick={() => setStep(1)}
      >
        Back
      </button>
    </form>
  );

  const renderStep3 = () => (
    <form onSubmit={handlePasswordReset} className="auth-form">
      <h2>Reset Password</h2>
      <p>Enter your new password.</p>
      
      <div className="form-group">
        <label>New Password</label>
        <input
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="Enter new password"
          required
        />
      </div>

      <div className="form-group">
        <label>Confirm New Password</label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm new password"
          required
        />
      </div>

      <button type="submit" className="auth-button">Reset Password</button>
      
      <button
        type="button"
        className="auth-button secondary"
        onClick={() => setStep(2)}
      >
        Back
      </button>
    </form>
  );

  return (
    <div className="auth-page">
      <div className="auth-header">
        <Link to="/" className="auth-title-link">
          <h1 className="auth-title">DwellSync</h1>
        </Link>
      </div>
      <div className="auth-container">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        
        {message && (
          <div className={`message ${message.includes('successfully') || message.includes('retrieved') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
} 