import React, { useState, useEffect } from 'react';
import './TenantProfile.css';
import { apiUrl } from '../../lib/api';

const TenantProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', name: '', phoneNumber: '', address: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const saved = localStorage.getItem('dwellSyncUser');
        if (!saved) throw new Error("User not logged in");
        const token = JSON.parse(saved).token;

        const res = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch user data');

        const data = await res.json();
        setUser(data);
        setFormData({ ...data });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = JSON.parse(localStorage.getItem('dwellSyncUser')).token;

      const res = await fetch(apiUrl('/api/auth/update'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to update profile');

      const updated = await res.json();
      setUser(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="tenant-profile">
      <h2 className="section-title">My Profile</h2>

      {!isEditing ? (
        <div className="profile-info">
          <div className="profile-header">
            <div className="profile-avatar">{user.name?.charAt(0).toUpperCase() || 'U'}</div>
            <div>
              <h3 className="profile-name">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}</h3>
              <p className="profile-role">{user.role}</p>
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-item"><span className="detail-label">Email:</span><span className="detail-value">{user.email}</span></div>
            <div className="detail-item"><span className="detail-label">Phone:</span><span className="detail-value">{user.phoneNumber || 'Not provided'}</span></div>
            <div className="detail-item"><span className="detail-label">Address:</span><span className="detail-value">{user.address || 'Not provided'}</span></div>
          </div>

          <button className="btn-primary edit-profile-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
        </div>
      ) : (
        <form className="profile-form" onSubmit={handleSubmit}>
          {['firstName', 'lastName', 'email', 'name', 'phoneNumber', 'address'].map(field => (
            <div className="form-group" key={field}>
              <label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <input
                id={field}
                name={field}
                type={field === 'email' ? 'email' : 'text'}
                value={formData[field] || ''}
                onChange={handleChange}
                required={['email', 'name'].includes(field)}
              />
            </div>
          ))}

          <div className="form-actions">
            <button type="submit" className="btn-primary">Save Changes</button>
            <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TenantProfile;
