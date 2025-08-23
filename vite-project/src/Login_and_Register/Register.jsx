import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../components/auth.css';
import { AuthContext } from '../App';

export default function Register() {
  const navigate = useNavigate();
  const { isLoggedIn } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    name: '', // matches backend key
    password: '',
    confirmPassword: '',
    role: '',
    securityQuestion: '',
    securityAnswer: '',
    phone: '',
    address: ''
  });

  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isLoggedIn) navigate('/');
  }, [isLoggedIn, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    try {
      const res = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      setMessage(data.message);

      if (res.ok) {
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      setMessage('Registration failed.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-header">
        <Link to="/" className="auth-title-link">
          <h1 className="auth-title">DwellSync</h1>
        </Link>
      </div>
      <div className="auth-container">
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Name Fields */}
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label>Who are you?</label>
            <select name="role" value={formData.role} onChange={handleChange} required>
              <option value="">Select</option>
              <option value="Owner">Owner</option>
              <option value="Tenant">Tenant</option>
              <option value="Security Guard">Security Guard</option>
              <option value="Service Provider">Service Provider</option>
            </select>
          </div>

          <div className="form-group">
            <label>Security Question</label>
            <select name="securityQuestion" value={formData.securityQuestion} onChange={handleChange} required>
              <option value="">Select a security question</option>
              <option value="What was the name of your first pet?">What was the name of your first pet?</option>
              <option value="In which city were you born?">In which city were you born?</option>
              <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
              <option value="What was your favorite subject in school?">What was your favorite subject in school?</option>
              <option value="What is the name of the street you grew up on?">What is the name of the street you grew up on?</option>
              <option value="What was your first car?">What was your first car?</option>
            </select>
          </div>

          <div className="form-group">
            <label>Security Answer</label>
            <input type="text" name="securityAnswer" value={formData.securityAnswer} onChange={handleChange} required />
          </div>

          <button type="submit" className="auth-button">Register</button>
        </form>

        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
