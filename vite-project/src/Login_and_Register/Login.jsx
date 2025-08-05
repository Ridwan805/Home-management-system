import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../components/auth.css';
import { AuthContext } from '../App';

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
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.userName,
          password: formData.password
        })
      });
      const data = await res.json();
      if (res.ok) {
        login({ 
          userName: data.user.name, 
          token: data.token, 
          role: data.user.role, 
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName
        });
        setPopupMessage(data.message);  // Use the message from server
        setTimeout(() => {
          setPopupMessage('');
          navigate('/');
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
