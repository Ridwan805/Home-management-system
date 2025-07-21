import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './auth.css';
import { AuthContext } from '../App';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    userName: '',
    password: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.userName,
          password: formData.password
        })
      });
      const data = await res.json();
      setMessage(data.message);
      if (res.ok) {
        login({ userName: formData.userName });
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (err) {
      setMessage('Error in login');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">DwellSync</h1>
        <form onSubmit={handleSubmit} className="auth-form">
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

          <button type="submit" className="register-btn">Login</button>
          
          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button 
            type="button" 
            className="login-btn"
            onClick={() => navigate('/register')}
          >
            Register
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
