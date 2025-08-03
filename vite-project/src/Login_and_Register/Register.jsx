import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../components/auth.css';
import backgroundImage from '../assets/Login-reg.jpg';
import { AuthContext } from '../App';

export default function Register() {
  const navigate = useNavigate();
  const { isLoggedIn } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    userName: '',
    password: '',
    confirmPassword: '',
    role: ''
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
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          name: formData.userName,
          password: formData.password,
          role: formData.role
        })
      });
      const data = await res.json();
      setMessage(data.message);
      if (res.ok) {
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      setMessage('Error in registration');
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
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name"
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>User Name</label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                placeholder="User Name"
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Who are you?</label>
            <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                <option value="Owner">Owner</option>
                <option value="Tenant">Tenant</option>
                <option value="Security Guard">Security Guard</option>
                <option value="Service Provider">Service Provider</option>
              </select>
          </div>

          <button type="submit" className="auth-button">Register</button>
          <div className="auth-divider">
            <span>OR</span>
          </div>
          <button
            type="button"
            className="auth-button secondary"
            onClick={() => navigate('/login')}
          >
            Log In
          </button>
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
