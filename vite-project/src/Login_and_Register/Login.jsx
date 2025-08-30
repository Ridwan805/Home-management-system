import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../components/auth.css';
import { AuthContext } from '../App';
import apiConfig from '../config/api';

export default function Login() {
  const navigate = useNavigate();
  const { login, setPopupMessage } = useContext(AuthContext);
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
      // Check if this is an admin login attempt
      const isAdminLogin = formData.userName.includes('admin') || 
                          formData.userName === 'admin1@dwell.com' || 
                          formData.userName === 'admin2@dwell.com' ||
                          formData.userName === 'testadmin@dwell.com';
      
      const loginEndpoint = isAdminLogin ? 
        apiConfig.getUrl('/api/admin/login') :
        apiConfig.getUrl('/api/auth/login');
      
      const requestBody = isAdminLogin ? 
        { email: formData.userName, password: formData.password } :
        { name: formData.userName, password: formData.password };
      
      const res = await fetch(loginEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await res.json();
      if (res.ok) {
        login({ 
          userName: data.user.name, 
          token: data.token, 
          role: data.user.role, 
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          userId: data.user.id || data.user._id
        });
        setPopupMessage(data.message);  // Use the message from server
        
        // Redirect based on user role
        setTimeout(() => {
          setPopupMessage('');
          if (data.user.role === 'Owner') {
            navigate('/dashboard');
          } else if (data.user.role === 'Tenant') {
            navigate('/tenant/profile');
          } else if (data.user.role === 'admin') {
            // Redirect to admin dashboard
            navigate('/admin');
          } else if (data.user.role === 'Security Guard') {
            // Redirect to security guard dashboard
            navigate('/security-guard/profile');
          } else if (data.user.role === 'Service Provider') {
            // Future implementation for service provider dashboard
            navigate('/');
          } else {
            navigate('/');
          }
        }, 2000);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage('Error in login');
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
          <div className="form-group">
            <label>User Name/Email</label>
            <input
              type="text"
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              placeholder="User Name/Email"
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

          <div className="forgot-password-link">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          <button type="submit" className="auth-button">Log In</button>
          
          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button 
            type="button" 
            className="auth-button secondary"
            onClick={() => navigate('/register')}
          >
            Register
          </button>
        </form>
        {message && (
          <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
